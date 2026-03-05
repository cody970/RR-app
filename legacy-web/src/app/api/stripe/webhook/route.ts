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

    const session = event.data.object as any;

    if (event.type === "checkout.session.completed") {
        // Retrieve the subscription details from Stripe
        const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
        )) as Stripe.Subscription;

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
                        (subscription as any).current_period_end * 1000
                    ),
                    subscriptionStatus: "active", // Or based on your tier logic
                },
            });
        }
    }

    if (event.type === "invoice.payment_succeeded") {
        const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
        )) as Stripe.Subscription;

        const stripeCustomerId = subscription.customer as string;

        // Find organization by customer ID
        await prisma.organization.update({
            where: {
                stripeCustomerId: stripeCustomerId,
            },
            data: {
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                    (subscription as any).current_period_end * 1000
                ),
                subscriptionStatus: "active",
            },
        });
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
        const subscription = (await stripe.subscriptions.retrieve(
            session.id as string
        )) as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        await prisma.organization.update({
            where: {
                stripeCustomerId: stripeCustomerId,
            },
            data: {
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                    (subscription as any).current_period_end * 1000
                ),
                subscriptionStatus: subscription.status === "active" ? "active" : "canceled",
            }
        })
    }


    return new NextResponse(null, { status: 200 });
}
