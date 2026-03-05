"use client";

import Link from "next/link";
import { ArrowLeft, Target, Users, Sparkles, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-amber-500/20">
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-amber-500/10 h-16 flex items-center">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-2 text-amber-500 font-bold">
                        <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-[10px] text-white">RR</div>
                        RoyaltyRadar
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-24 h-full">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 mb-8">
                        Our Mission
                    </div>
                    <h1 className="text-5xl font-bold mb-8 tracking-tight">Recovering the heartbeat of the music industry.</h1>
                    <p className="text-xl text-slate-600 leading-relaxed mb-12 font-light">
                        RoyaltyRadar was founded on a simple principle: artists should be paid for their work. In a fragmented global streaming landscape, billions of dollars in royalties go unclaimed every year. We're here to change that.
                    </p>

                    <div className="grid md:grid-cols-2 gap-12 mt-20">
                        <div className="space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Target className="w-6 h-6 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-bold">Precision Auditing</h3>
                            <p className="text-slate-600">
                                We leverage cutting-edge AI and direct DSP data to identify discrepancies that human audits simply miss.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-bold">Artist First</h3>
                            <p className="text-slate-600">
                                Designed for publishers and labels, but built for the artist experience. We prioritize transparency above all else.
                            </p>
                        </div>
                    </div>

                    <div className="mt-32 p-12 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                        <h2 className="text-3xl font-bold mb-6">Join the Revolution</h2>
                        <p className="text-slate-400 mb-8 max-w-lg text-lg">
                            Whether you're an independent creator or a major publishing house, RoyaltyRadar provides the infrastructure you need to thrive.
                        </p>
                        <Button asChild size="lg" className="bg-amber-500 text-white hover:bg-amber-600 rounded-xl px-10">
                            <Link href="/register">Start Now</Link>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
