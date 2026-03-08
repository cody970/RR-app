import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db as prisma } from "@/lib/infra/db";
import { PricingCards, statusToTierName } from "@/components/billing/pricing-cards";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default async function BillingPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/auth/login");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { organization: true },
    });

    if (!user || user.role !== "OWNER") {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold">Billing & Subscription</h1>
                <p className="text-muted-foreground mt-2">Only organization owners can manage billing.</p>
            </div>
        );
    }

    const { organization } = user;
    const isSubscribed = organization.subscriptionStatus === "active" && organization.stripeCurrentPeriodEnd && organization.stripeCurrentPeriodEnd > new Date();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Billing & Subscription</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>
                            Manage your subscription and billing details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-lg capitalize">{organization.subscriptionStatus === "active" ? "Subscribed" : organization.subscriptionStatus}</p>
                                {organization.stripeCurrentPeriodEnd && (
                                    <p className="text-sm text-muted-foreground">
                                        Next billing date: {new Date(organization.stripeCurrentPeriodEnd).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            {isSubscribed ? (
                                <form action="/api/stripe/portal" method="POST">
                                    <Button type="submit" variant="outline" className="gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        Manage Billing
                                    </Button>
                                </form>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-6">Available Plans</h3>
                <PricingCards currentTier={statusToTierName(organization.subscriptionStatus)} />
            </div>
        </div>
    );
}
