import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db as prisma } from "@/lib/infra/db";
import { stripe } from "@/lib/infra/stripe";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { priceId } = await req.json();

        if (!priceId) {
            return NextResponse.json(
                { error: "Price ID is required" },
                { status: 400 }
            );
        }

        // Get the user and organization
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { organization: true },
        });

        if (!user || user.role !== "OWNER") {
            return NextResponse.json(
                { error: "Only organization owners can manage billing" },
                { status: 403 }
            );
        }

        const { organization } = user;

        // Create a new Stripe Customer if they don't have one
        let stripeCustomerId = organization.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: organization.name,
                metadata: {
                    orgId: organization.id,
                },
            });

            stripeCustomerId = customer.id;

            await prisma.organization.update({
                where: { id: organization.id },
                data: { stripeCustomerId },
            });
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings/billing`;

        // Create the checkout session
        const stripeSession = await stripe.checkout.sessions.create({
            success_url: `${returnUrl}?success=true`,
            cancel_url: `${returnUrl}?canceled=true`,
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            customer: stripeCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: {
                orgId: organization.id,
            },
        });

        return NextResponse.json({ url: stripeSession.url });
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
