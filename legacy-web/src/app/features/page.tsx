"use client";

import Link from "next/link";
import { ArrowLeft, Zap, Search, Shield, BarChart3, Globe, Database, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
    {
        icon: Globe,
        title: "Global DSP Monitoring",
        description: "Real-time auditing across Spotify, Apple Music, YouTube, and 50+ other DSPs worldwide.",
    },
    {
        icon: Search,
        title: "AI Conflict Detection",
        description: "Our proprietary ML models identify split conflicts and metadata mismatches with 99.2% accuracy.",
    },
    {
        icon: Database,
        title: "Metadata Restoration",
        description: "Automated ISRC to ISWCs mapping and enrichment to ensure your catalog is always clean.",
    },
    {
        icon: BarChart3,
        title: "Revenue Forecasting",
        description: "Predict unclaimed royalties and track the recovery progress of every single work in your catalog.",
    },
    {
        icon: Shield,
        title: "Immutable Audit Logs",
        description: "Cryptographically secure logs for every transaction and recovery action taken on our platform.",
    },
    {
        icon: FileCheck,
        title: "Direct Dispute Filing",
        description: "One-click filing with societies and DSPs to resolve conflicts and recover black box revenue.",
    },
];

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-amber-500/20">
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-amber-500/10 h-16 flex items-center">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-2 text-amber-500 font-bold font-logo text-lg tracking-tight">
                        <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-[10px] text-white">RR</div>
                        RoyaltyRadar
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h1 className="text-5xl font-bold mb-6 tracking-tight">Enterprise Infrastructure for Modern Music</h1>
                        <p className="text-xl text-slate-600 leading-relaxed font-light">
                            Built for publishers, labels, and world-class artist teams. Scale your royalty operations without scaling your overhead.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <div key={i} className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed text-sm">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-24 p-12 rounded-[2.5rem] bg-amber-500 text-white flex flex-col items-center text-center">
                        <Zap className="w-12 h-12 mb-6" />
                        <h2 className="text-4xl font-bold mb-6">Ready to audit your catalog?</h2>
                        <p className="text-amber-50 mb-10 max-w-2xl text-lg">
                            Join hundreds of publishers using RoyaltyRadar to secure their income. Start your free 14-day trial today.
                        </p>
                        <Button asChild size="lg" className="bg-white text-amber-500 hover:bg-slate-50 rounded-xl px-12 h-14 text-lg">
                            <Link href="/register">Start Free Trial</Link>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
