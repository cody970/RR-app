"use client";

import Link from "next/link";
import { UploadCloud, ScanSearch, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
    {
        title: "Import Your Catalog",
        description: "Upload your works, recordings, and writer data via CSV or use our templates.",
        icon: UploadCloud,
        href: "/dashboard/import",
        cta: "Start Importing",
        color: "amber",
    },
    {
        title: "Enrich Metadata",
        description: "Auto-fill missing ISWCs, ISRCs, and artist data from Spotify and global databases.",
        icon: Sparkles,
        href: "/dashboard/catalog",
        cta: "Browse Catalog",
        color: "slate",
    },
    {
        title: "Run Your First Audit",
        description: "Scan for anomalies: missing identifiers, split conflicts, unlinked recordings, and unclaimed revenue.",
        icon: ScanSearch,
        href: "/dashboard/audit",
        cta: "Launch Audit",
        color: "emerald",
    },
];

export function OnboardingWizard() {
    return (
        <div className="border border-slate-200 rounded-2xl bg-gradient-to-br from-white via-white to-amber-50/50 p-8 shadow-xl shadow-slate-200/40">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Welcome to <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">RoyaltyRadar</span>
                </h2>
                <p className="text-slate-500 max-w-lg mx-auto">
                    Get started in 3 simple steps. Import your catalog, enrich it with global metadata, then run your first audit to detect revenue leakage.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 relative">
                {steps.map((step, i) => (
                    <div
                        key={step.title}
                        className="relative group rounded-xl border border-slate-200 bg-white p-6 hover:border-amber-300 transition-all duration-300 hover:shadow-md hover:shadow-amber-900/5 relative"
                    >
                        {/* Step number */}
                        <div className="absolute -top-3 -left-3 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-amber-500/20">
                            {i + 1}
                        </div>

                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-colors
                            ${step.color === "amber" ? "bg-amber-100 text-amber-600 border border-amber-200 group-hover:bg-amber-200" :
                                step.color === "slate" ? "bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200" :
                                    "bg-emerald-100 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-200"}`}
                        >
                            <step.icon className="h-6 w-6" />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 leading-relaxed">{step.description}</p>

                        <Link href={step.href}>
                            <Button
                                className={`w-full h-10 ${step.color === "emerald"
                                    ? "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
                                    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
                                    }`}
                            >
                                {step.cta}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>

                        {/* Connector arrow (not on last) */}
                        {i < steps.length - 1 && (
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-slate-300 z-10 w-8 flex justify-center">
                                <ArrowRight className="h-5 w-5" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
