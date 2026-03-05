"use client";

import { motion } from "framer-motion";
import { Star, MessageSquareQuote } from "lucide-react";
import Image from "next/image";

const testimonials = [
    {
        quote: "RoyaltyRadar found $40k in unclaimed YouTube revenue from our 2022 catalog in just 48 hours. The ROI was instantaneous.",
        author: "Sarah Jenkins",
        role: "VP of Royalty Administration",
        company: "Sonic Horizon Publishing",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    },
    {
        quote: "The interface is lightyears ahead of legacy auditing software. It's the first time our team actually enjoys catalog cleanup.",
        author: "Marcus Chen",
        role: "Independent Artist & Label Owner",
        company: "Velvet Records",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    },
    {
        quote: "We've integrated RR into our entire onboarding flow. It's now our source of truth for ISRC-ISWC mapping.",
        author: "Elena Rodriguez",
        role: "Head of Operations",
        company: "Global Beat Group",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    },
];

export function Testimonials() {
    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Trusted by the best.</h2>
                    <p className="text-slate-500 max-w-xl mx-auto">See why top publishers and labels choose RoyaltyRadar.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 fill-amber-500 text-amber-500" />
                                    ))}
                                </div>
                                <p className="text-slate-700 text-lg leading-relaxed mb-8 italic">
                                    "{t.quote}"
                                </p>
                            </div>

                            <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-50">
                                    <img src={t.avatar} alt={t.author} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">{t.author}</div>
                                    <div className="text-xs text-slate-500">{t.role}</div>
                                    <div className="text-xs font-bold text-amber-600 mt-0.5">{t.company}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
