import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/infra/stripe";
import { db as prisma } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import Stripe from "stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    // Idempotency: skip already-processed events
    const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } }).catch(() => null);
    if (existing) {
        return new NextResponse(null, { status: 200 });
    }
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } }).catch(() => { });

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const subscriptionId = session.subscription as string;

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            if ((subscription as any).deleted) return new NextResponse(null, { status: 200 });

            if (session?.metadata?.orgId) {
                await prisma.organization.update({
                    where: { id: session.metadata.orgId },
                    data: {
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        stripePriceId: subscription.items.data[0].price.id,
                        stripeCurrentPeriodEnd: new Date(
                            subscription.current_period_end * 1000
                        ),
                        subscriptionStatus: "active",
                    },
                });
            }
        }

        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId = invoice.subscription as string;

            if (!subscriptionId) return new NextResponse(null, { status: 200 });

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            if ((subscription as any).deleted) return new NextResponse(null, { status: 200 });

            const stripeCustomerId = subscription.customer as string;

            await prisma.organization.update({
                where: { stripeCustomerId },
                data: {
                    stripePriceId: subscription.items.data[0].price.id,
                    stripeCurrentPeriodEnd: new Date(
                        subscription.current_period_end * 1000
                    ),
                    subscriptionStatus: "active",
                },
            });
        }

        if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
            const subscription = event.data.object as Stripe.Subscription;

            if ((subscription as any).deleted) {
                await prisma.organization.update({
                    where: { stripeSubscriptionId: subscription.id },
                    data: { subscriptionStatus: "canceled" }
                });
                return new NextResponse(null, { status: 200 });
            }

            const stripeCustomerId = subscription.customer as string;

            await prisma.organization.update({
                where: { stripeCustomerId },
                data: {
                    stripePriceId: subscription.items.data[0].price.id,
                    stripeCurrentPeriodEnd: new Date(
                        subscription.current_period_end * 1000
                    ),
                    subscriptionStatus: subscription.status === "active" ? "active" : "canceled",
                }
            });
        }
    } catch (err) {
        // Log the error but still return 200 to prevent Stripe from retrying indefinitely
        logger.error({ err, eventType: event.type, eventId: event.id }, "Stripe webhook handler error");
    }

    return new NextResponse(null, { status: 200 });
}
