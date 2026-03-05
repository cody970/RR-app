"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
    {
        question: "How does RoyaltyRadar find 'missing' money?",
        answer: "We cross-reference your catalog against public performance, mechanical, and streaming databases globally using AI-driven ingestion. We identify discrepancies where usage was reported but payouts were blocked due to metadata mismatches or split conflicts.",
    },
    {
        question: "Is my data secure?",
        answer: "Yes. We use enterprise-grade AES-256 encryption. We are SOC 2 compliant and never store your login credentials for DSPs. We use read-only OAuth connections wherever possible.",
    },
    {
        question: "How much does the recovery fee cost?",
        answer: "Our standard plan includes a 5% recovery fee on recovered black box revenue. This is significantly lower than traditional audit houses which often take 15-20%.",
    },
    {
        question: "How long does a full audit take?",
        answer: "Initial ingestion takes minutes. A deep global scan typically completes within 48 to 72 hours, after which you'll receive a full conflict report.",
    },
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-16">
                    <HelpCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Common Questions</h2>
                    <p className="text-slate-500">Everything you need to know about getting started.</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-amber-200 transition-colors">
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/50 transition-colors"
                            >
                                <span className="font-bold text-slate-900 text-lg">{faq.question}</span>
                                {openIndex === i ? (
                                    <Minus className="w-5 h-5 text-amber-500" />
                                ) : (
                                    <Plus className="w-5 h-5 text-slate-400" />
                                )}
                            </button>
                            <AnimatePresence>
                                {openIndex === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
