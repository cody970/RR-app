"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const PRICING_TIERS = [
    {
        name: "Starter",
        id: "tier-starter",
        priceId: "price_1Starter", // REPLACE WITH REAL STRIPE PRICE ID
        price: "$29",
        description: "Perfect for independent artists and small catalogs.",
        features: [
            "Up to 500 works",
            "Basic statement ingestion",
            "Catalog management",
            "Email support",
        ],
    },
    {
        name: "Pro",
        id: "tier-pro",
        priceId: "price_1Pro", // REPLACE WITH REAL STRIPE PRICE ID
        price: "$99",
        description: "For established publishers and administrators.",
        features: [
            "Unlimited works",
            "Advanced statement parsing",
            "Sync Licensing CRM",
            "PRO CWR Registrations",
            "Priority API support",
        ],
    },
];

export function PricingCards({ currentTier }: { currentTier?: string }) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSubscribe = async (priceId: string) => {
        try {
            setLoading(priceId);
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceId }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error(data.error);
                alert(data.error || "Failed to start checkout");
            }
        } catch (error) {
            console.error(error);
            alert("Something went wrong.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl mx-auto">
            {PRICING_TIERS.map((tier) => (
                <Card
                    key={tier.id}
                    className={`flex flex-col justify-between ${tier.name === currentTier ? "border-amber-500 shadow-md" : ""
                        }`}
                >
                    <CardHeader>
                        <CardTitle className="text-2xl">{tier.name}</CardTitle>
                        <CardDescription>{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="text-4xl font-bold">
                            {tier.price} <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </div>
                        <ul className="grid gap-2 text-sm text-muted-foreground">
                            {tier.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-amber-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {tier.name === currentTier ? (
                            <Button className="w-full" variant="outline" disabled>
                                Current Plan
                            </Button>
                        ) : (
                            <Button
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => handleSubscribe(tier.priceId)}
                                disabled={loading !== null}
                            >
                                {loading === tier.priceId ? "Redirecting..." : "Upgrade"}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
