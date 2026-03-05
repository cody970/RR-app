"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, CheckCircle2, AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InteractiveDemo() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"idle" | "scanning" | "results">("idle");
    const [progress, setProgress] = useState(0);

    const startScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;
        setStatus("scanning");
        setProgress(0);
    };

    useEffect(() => {
        if (status === "scanning") {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStatus("results"), 500);
                        return 100;
                    }
                    return prev + 2;
                });
            }, 40);
            return () => clearInterval(interval);
        }
    }, [status]);

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto backdrop-blur-xl bg-slate-50/50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
                    <div className="p-8 md:p-12">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">See what you're missing.</h2>
                            <p className="text-slate-500">Enter any song title or ISRC to run a simulated catalog audit.</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {status === "idle" && (
                                <motion.form
                                    key="idle"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onSubmit={startScan}
                                    className="flex flex-col md:flex-row gap-4"
                                >
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <Input
                                            placeholder="e.g. 'Blinding Lights' or 'USUM71900001'"
                                            className="pl-12 h-14 rounded-2xl border-slate-200 bg-white"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button type="submit" size="lg" className="h-14 px-8 bg-amber-500 hover:bg-amber-600 rounded-2xl text-lg font-bold shadow-lg shadow-amber-500/20">
                                        Run AI Audit
                                    </Button>
                                </motion.form>
                            )}

                            {status === "scanning" && (
                                <motion.div
                                    key="scanning"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-8 py-10"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-600 uppercase tracking-wider">Scanning Global DSPs...</span>
                                        <span className="text-sm font-bold text-amber-500">{progress}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-amber-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {["Spotify", "Apple", "YouTube", "Amazon"].map((dsp, i) => (
                                            <div key={dsp} className={cn(
                                                "p-4 rounded-xl border text-center transition-all",
                                                progress > (i + 1) * 20 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-100 text-slate-400"
                                            )}>
                                                {progress > (i + 1) * 20 ? <CheckCircle2 className="w-5 h-5 mx-auto mb-2" /> : <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />}
                                                <span className="text-xs font-bold uppercase">{dsp}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {status === "results" && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4">
                                        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-bold text-amber-800 text-lg">Potential Discrepancy Detected</h4>
                                            <p className="text-amber-700/80">Found metadata mismatch on **YouTube Content ID** for "{query}". Estimated unclaimed revenue: **$1,420.50**.</p>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4 text-center">
                                        {[
                                            { label: "Confidence", val: "99.2%", color: "text-green-600" },
                                            { label: "Matches", val: "24/25", color: "text-slate-900" },
                                            { label: "Priority", val: "High", color: "text-red-500" },
                                        ].map((st, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-white border border-slate-200">
                                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">{st.label}</div>
                                                <div className={cn("text-2xl font-black", st.color)}>{st.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center pt-4">
                                        <Button onClick={() => setStatus("idle")} variant="ghost" className="text-slate-500 hover:text-slate-900">
                                            Reset Demo
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
