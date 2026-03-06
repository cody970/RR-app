import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db as prisma } from "@/lib/infra/db";
import { stripe } from "@/lib/infra/stripe";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        if (!organization.stripeCustomerId) {
            return NextResponse.json(
                { error: "Organization does not have a Stripe customer" },
                { status: 400 }
            );
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings/billing`;

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: organization.stripeCustomerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("Stripe Portal Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
