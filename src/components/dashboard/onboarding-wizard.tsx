"use client";

import Link from "next/link";
import { UploadCloud, ScanSearch, Sparkles, ArrowRight } from "lucide-react";
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
        <div className="border border-border/50 rounded-3xl bg-gradient-to-br from-card via-card to-indigo-500/[0.03] p-10 shadow-2xl shadow-black/[0.03] dark:shadow-black/40 glass-card relative overflow-hidden">
            {/* Ambient background effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="text-center mb-12 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">
                    <Sparkles className="h-3 w-3" />
                    Quick Start Guide
                </div>
                <h2 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">
                    Welcome to <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">RoyaltyRadar</span>
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-sm font-medium leading-relaxed">
                    Elevate your publishing operations in three steps. Centralize your catalog, automate metadata enrichment, and eliminate revenue leakage.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
                {steps.map((step, i) => (
                    <div
                        key={step.title}
                        className="relative group rounded-2xl border border-border/50 bg-card/50 p-8 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/[0.05] backdrop-blur-sm"
                    >
                        {/* Step number badge */}
                        <div className="absolute -top-3 -left-3 h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/30 border border-white/10">
                            {i + 1}
                        </div>

                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner
                            ${step.color === "amber" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" :
                                step.color === "slate" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20" :
                                    "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20"}`}
                        >
                            <step.icon className="h-7 w-7" />
                        </div>

                        <h3 className="text-lg font-bold text-foreground mb-3 tracking-tight">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-sm">
                            {step.description}
                        </p>

                        <div className="mt-auto">
                            <Link href={step.href}>
                                <Button
                                    className={`w-full h-11 rounded-xl transition-all duration-300 font-bold tracking-tight group/btn
                                        ${i === 2
                                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 border-none"
                                            : "bg-background hover:bg-muted text-foreground border border-border shadow-sm"
                                        }`}
                                >
                                    {step.cta}
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                </Button>
                            </Link>
                        </div>

                        {/* Visual Connector (hidden on mobile) */}
                        {i < steps.length - 1 && (
                            <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 text-border/40 z-10">
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
