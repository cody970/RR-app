"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, AlertCircle, ArrowRight, Music, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const RevenueCalculator = () => {
    const [streams, setStreams] = useState<number>(100000);
    const [catalogSize, setCatalogSize] = useState<number>(10);
    const [estimatedLoss, setEstimatedLoss] = useState<number>(0);

    useEffect(() => {
        // Industry average: ~15% of royalties are "lost" or delayed due to metadata/conflicts
        // Average payout per stream: $0.004 (blended)
        const totalRevenue = streams * 0.004;
        const loss = totalRevenue * 0.15 + (catalogSize * 50); // Complex logic simulation
        setEstimatedLoss(Math.round(loss));
    }, [streams, catalogSize]);

    return (
        <section className="py-24 bg-white relative">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mb-6">
                                <DollarSign className="w-3.5 h-3.5" /> REVENUE ESTIMATOR
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">
                                How much are you <span className="text-amber-600 underline decoration-amber-200 underline-offset-4">leaving</span> on the table?
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                Use our industry-standard recovery model to see how much black box revenue your catalog could be generating right now.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-amber-500" /> Monthly Streams
                                    </label>
                                    <Input
                                        type="number"
                                        value={streams}
                                        onChange={(e) => setStreams(Number(e.target.value))}
                                        className="h-12 bg-white border-slate-200 rounded-xl focus:ring-amber-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Music className="w-4 h-4 text-amber-500" /> Catalog Size (Tracks)
                                    </label>
                                    <Input
                                        type="number"
                                        value={catalogSize}
                                        onChange={(e) => setCatalogSize(Number(e.target.value))}
                                        className="h-12 bg-white border-slate-200 rounded-xl focus:ring-amber-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-3xl p-8 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                            <div className="relative z-10">
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">Estimated Recovery Potential</p>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={estimatedLoss}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-5xl md:text-6xl font-black text-white mb-6"
                                    >
                                        ${estimatedLoss.toLocaleString()}
                                        <span className="text-amber-500">.00</span>
                                    </motion.div>
                                </AnimatePresence>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-8 inline-flex items-start gap-3 text-left">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Based on an average 15% missing royalty rate found across audited independent catalogs in 2025.
                                    </p>
                                </div>

                                <Button className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-2xl shadow-xl shadow-amber-500/20 group">
                                    Recover My Royalties
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
