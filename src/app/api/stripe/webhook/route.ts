import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db as prisma } from "@/lib/db";
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

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const subscriptionId = session.subscription as string;

        // Retrieve the subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

        // Guard against deleted subscription
        if (subscription.deleted) return new NextResponse("Subscription deleted", { status: 400 });

        // Update the organization in your database
        if (session?.metadata?.orgId) {
            await prisma.organization.update({
                where: {
                    id: session.metadata.orgId,
                },
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
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) return new NextResponse("No subscription on invoice", { status: 400 });

        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        if (subscription.deleted) return new NextResponse("Subscription deleted", { status: 400 });

        const stripeCustomerId = subscription.customer as string;

        // Find organization by customer ID
        await prisma.organization.update({
            where: {
                stripeCustomerId: stripeCustomerId,
            },
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
        const subscription = event.data.object as any;
        // In deleted/updated events, the object is the subscription itself.
        // If it's a deleted event, it might be a DeletedSubscription object.
        if (subscription.deleted) {
            await prisma.organization.update({
                where: { stripeSubscriptionId: subscription.id },
                data: { subscriptionStatus: "canceled" }
            });
            return new NextResponse(null, { status: 200 });
        }

        const stripeCustomerId = subscription.customer as string;

        await prisma.organization.update({
            where: {
                stripeCustomerId: stripeCustomerId,
            },
            data: {
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                    subscription.current_period_end * 1000
                ),
                subscriptionStatus: subscription.status === "active" ? "active" : "canceled",
            }
        })
    }


    return new NextResponse(null, { status: 200 });
}
