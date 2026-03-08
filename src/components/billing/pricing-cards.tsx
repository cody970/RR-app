"use client";

import { useState } from "react";
import { Check, Gift, Zap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const PRICING_TIERS = [
    {
        name: "Free",
        id: "tier-free",
        priceId: null, // No Stripe price — always free
        price: "$0",
        description: "Explore catalog management with no commitment.",
        badge: "Free Forever",
        icon: Gift,
        features: [
            "Up to 50 works & recordings",
            "1 statement import / month",
            "Basic metadata audit",
            "ISRC lookup tool",
            "Community support",
        ],
    },
    {
        name: "Starter",
        id: "tier-starter",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "price_starter",
        price: "$29",
        description: "Perfect for independent artists and small catalogs.",
        icon: Zap,
        features: [
            "Up to 500 works & recordings",
            "Unlimited statement ingestion",
            "Advanced metadata auditing",
            "CSV & CWR import",
            "Email support",
        ],
    },
    {
        name: "Pro",
        id: "tier-pro",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "price_pro",
        price: "$99",
        description: "For established publishers and administrators.",
        badge: "Most Popular",
        icon: Zap,
        features: [
            "Unlimited works & recordings",
            "Advanced AI audit engine",
            "PRO / Society registrations",
            "Content ID monitoring",
            "MLC & sync licensing",
            "Real-time DSP analytics",
            "Priority support",
        ],
    },
    {
        name: "Enterprise",
        id: "tier-enterprise",
        priceId: null, // Contact sales
        price: "Custom",
        description: "For labels and large publishers at scale.",
        icon: Building2,
        features: [
            "Everything in Pro",
            "Dedicated infrastructure",
            "Custom integrations & API",
            "SLA guarantees",
            "SSO & advanced RBAC",
            "Dedicated account manager",
        ],
    },
];

/** Normalise subscription status strings to a tier name */
export function statusToTierName(status: string | undefined): string {
    if (!status || status === "freemium" || status === "free") return "Free";
    if (status === "active") return "Pro"; // default for legacy active subscriptions
    return "Free";
}

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
                alert(data.error || "Failed to start checkout");
            }
        } catch {
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(null);
        }
    };

    const resolvedCurrent = currentTier ?? "Free";

    return (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 max-w-6xl mx-auto">
            {PRICING_TIERS.map((tier) => {
                const isCurrent = tier.name === resolvedCurrent;
                const isPro = tier.name === "Pro";
                const Icon = tier.icon;

                return (
                    <Card
                        key={tier.id}
                        className={`relative flex flex-col justify-between transition-all duration-300 ${
                            isCurrent
                                ? "border-indigo-500 shadow-lg shadow-indigo-500/10"
                                : isPro
                                  ? "border-slate-800 bg-slate-900 text-white"
                                  : "hover:border-indigo-200 hover:shadow-md"
                        }`}
                    >
                        {/* Badge */}
                        {(isCurrent || tier.badge) && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge
                                    variant={isCurrent ? "success" : "info"}
                                    className="text-[10px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap"
                                >
                                    {isCurrent ? "Current Plan" : tier.badge}
                                </Badge>
                            </div>
                        )}

                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isPro ? "bg-indigo-500/20" : "bg-slate-100"}`}>
                                    <Icon className={`h-4 w-4 ${isPro ? "text-indigo-400" : "text-slate-600"}`} aria-hidden="true" />
                                </div>
                                <CardTitle className={`text-base font-black ${isPro ? "text-white" : "text-slate-900"}`}>
                                    {tier.name}
                                </CardTitle>
                            </div>
                            <div className={`text-3xl font-black tracking-tighter mt-2 ${isPro ? "text-white" : "text-slate-900"}`}>
                                {tier.price}
                                {tier.price !== "Custom" && (
                                    <span className={`text-sm font-medium ${isPro ? "text-slate-400" : "text-slate-400"}`}>/mo</span>
                                )}
                            </div>
                            <CardDescription className={isPro ? "text-slate-400" : ""}>
                                {tier.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1">
                            <ul className="space-y-2">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-xs">
                                        <Check className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${isPro ? "text-indigo-400" : "text-emerald-600"}`} aria-hidden="true" />
                                        <span className={isPro ? "text-slate-300" : "text-slate-600"}>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>

                        <CardFooter className="pt-4">
                            {isCurrent ? (
                                <Button className="w-full" variant="outline" disabled aria-label="Current plan">
                                    Current Plan
                                </Button>
                            ) : tier.priceId === null ? (
                                <Button
                                    className="w-full"
                                    variant={tier.name === "Free" ? "outline" : "secondary"}
                                    asChild
                                >
                                    <a href={tier.name === "Enterprise" ? "mailto:sales@royaltyradar.com" : "/register"}>
                                        {tier.name === "Enterprise" ? "Contact Sales" : "Downgrade to Free"}
                                    </a>
                                </Button>
                            ) : (
                                <Button
                                    className={`w-full ${isPro ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                                    onClick={() => handleSubscribe(tier.priceId!)}
                                    disabled={loading !== null}
                                    aria-busy={loading === tier.priceId}
                                >
                                    {loading === tier.priceId ? "Redirecting…" : `Upgrade to ${tier.name}`}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}
