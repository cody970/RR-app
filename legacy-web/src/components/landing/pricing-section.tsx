"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tiers = [
    {
        name: "Starter",
        id: "tier-starter",
        href: "/register",
        priceMonthly: "$29",
        priceYearly: "$24",
        description: "Perfect for independent artists and small labels starting their recovery journey.",
        features: [
            "Up to 1,000 tracks audited",
            "Basic ISRC/ISWC matching",
            "Manual dispute filings",
            "Monthly revenue reports",
            "Standard support",
        ],
        mostPopular: false,
    },
    {
        name: "Professional",
        id: "tier-professional",
        href: "/register",
        priceMonthly: "$99",
        priceYearly: "$79",
        description: "Advanced tools for growing catalogs and medium-sized publishing houses.",
        features: [
            "Up to 10,000 tracks audited",
            "AI-powered conflict detection",
            "Automated DSP dispute filing",
            "Real-time metadata scrubbing",
            "Priority email support",
            "Custom analytics dashboard",
        ],
        mostPopular: true,
    },
    {
        name: "Enterprise",
        id: "tier-enterprise",
        href: "/register",
        priceMonthly: "Custom",
        priceYearly: "Custom",
        description: "High-volume solutions for major labels and international publishers.",
        features: [
            "Unlimited tracks audited",
            "Direct DSP API integrations",
            "Dedicated account manager",
            "Custom data exports",
            "API access for white-labeling",
            "24/7 Phone & Slack support",
        ],
        mostPopular: false,
    },
];

export const PricingSection = () => {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <div className="py-24 sm:py-32" id="pricing">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-amber-600">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                        Choose the right plan for your catalog
                    </p>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-slate-600">
                    Transparent pricing designed to scale with your collection. Start recovering your royalties today.
                </p>

                <div className="mt-16 flex justify-center">
                    <div className="relative flex w-64 rounded-full bg-slate-100 p-1 text-center text-xs font-semibold leading-5">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={cn(
                                "w-full rounded-full py-2 transition-all duration-200",
                                !isAnnual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={cn(
                                "w-full rounded-full py-2 transition-all duration-200",
                                isAnnual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Yearly
                            <span className="ml-1 text-amber-600 text-[10px] font-bold">-20%</span>
                        </button>
                    </div>
                </div>

                <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
                    {tiers.map((tier) => (
                        <motion.div
                            key={tier.id}
                            whileHover={{ y: -10 }}
                            className={cn(
                                tier.mostPopular ? "ring-2 ring-amber-500 bg-white" : "ring-1 ring-slate-200 bg-slate-50/50",
                                "rounded-3xl p-8 xl:p-10 relative flex flex-col justify-between"
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-x-4">
                                    <h3 id={tier.id} className={cn(tier.mostPopular ? "text-amber-600" : "text-slate-900", "text-lg font-semibold leading-8")}>
                                        {tier.name}
                                    </h3>
                                    {tier.mostPopular && (
                                        <p className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold leading-5 text-amber-600">
                                            Most popular
                                        </p>
                                    )}
                                </div>
                                <p className="mt-4 text-sm leading-6 text-slate-600">{tier.description}</p>
                                <p className="mt-6 flex items-baseline gap-x-1">
                                    <span className="text-4xl font-bold tracking-tight text-slate-900">
                                        {isAnnual ? tier.priceYearly : tier.priceMonthly}
                                    </span>
                                    {tier.priceMonthly !== "Custom" && (
                                        <span className="text-sm font-semibold leading-6 text-slate-600">/month</span>
                                    )}
                                </p>
                                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-slate-600">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex gap-x-3">
                                            <Check className="h-6 w-5 flex-none text-amber-500" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button
                                asChild
                                className={cn(
                                    "mt-8 w-full rounded-xl h-12 text-base font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                                    tier.mostPopular
                                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                )}
                            >
                                <a href={tier.href}>Get started today</a>
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
