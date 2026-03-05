"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, Star, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const WaitlistSection = () => {
    const [submitted, setSubmitted] = useState(false);
    const [email, setEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubmitted(true);
        }
    };

    return (
        <section className="py-24 bg-slate-900 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 md:p-20 text-center shadow-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold mb-8">
                            <Star className="w-4 h-4 fill-amber-400" /> JOIN THE INNER CIRCLE
                        </div>

                        {!submitted ? (
                            <>
                                <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                                    Secure your spot in the <br />
                                    <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">future of publishing.</span>
                                </h2>
                                <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                                    We are currently onboarding creators in batches to ensure maximum recovery performance. Join the waitlist for priority access to our Phase 1 automated audit engine.
                                </p>

                                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-center max-w-lg mx-auto">
                                    <div className="relative w-full">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <Input
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-16 pl-12 pr-4 bg-white/10 border-white/20 text-white rounded-2xl focus:ring-amber-500 w-full text-lg"
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="h-16 px-8 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-2xl w-full sm:w-auto text-lg shadow-xl shadow-amber-500/20 active:scale-95 transition-all group"
                                    >
                                        Join Waitlist
                                        <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </Button>
                                </form>

                                <div className="mt-8 flex items-center justify-center gap-6 text-slate-500 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500/60" /> No credit card required
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-amber-500/60" /> Phase 1 Priority
                                    </div>
                                </div>
                            </>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="py-10"
                            >
                                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/30">
                                    <CheckCircle2 className="w-10 h-10 text-amber-400" />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-4">You're on the list!</h3>
                                <p className="text-slate-400 text-lg mb-8">
                                    We've sent a confirmation to <span className="text-white font-medium">{email}</span>.<br />
                                    Keep an eye on your inbox for our Phase 1 entry key.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => setSubmitted(false)}
                                    className="border-white/10 text-white hover:bg-white/5 rounded-xl h-12"
                                >
                                    Try another email
                                </Button>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
