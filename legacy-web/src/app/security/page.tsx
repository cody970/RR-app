"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { TrustCredentials } from "@/components/landing/trust-credentials";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { motion } from "framer-motion";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
};

export default function SecurityPage() {
    return (
        <PageWrapper>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-amber-500/20 transition-colors duration-500">
                <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-amber-500/10 h-16 flex items-center">
                    <div className="container mx-auto px-6 flex justify-between items-center">
                        <Link href="/" className="flex items-center gap-2 group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">Back to Home</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-amber-500 font-bold">
                                <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-[10px] text-white">RR</div>
                                RoyaltyRadar Security
                            </div>
                            <ThemeToggle />
                        </div>
                    </div>
                </header>
                <main className="pt-32 pb-24">
                    <motion.div {...fadeInUp}>
                        <TrustCredentials />
                    </motion.div>
                    <div className="container mx-auto px-6 max-w-3xl mt-20">
                        <Shield className="w-12 h-12 text-amber-500 mb-8" />
                        <h1 className="text-4xl font-bold mb-6">Security & Compliance</h1>
                        <p className="text-lg text-slate-600 mb-12">
                            Your revenue data is your most sensitive asset. RoyaltyRadar is built with security as our first priority.
                        </p>
                        <div className="space-y-12">
                            <section>
                                <h2 className="text-2xl font-bold mb-4">SOC 2 Type II</h2>
                                <p className="text-slate-600">
                                    Our infrastructure is SOC 2 Type II certified, ensuring we meet the highest standards for security, availability, and processing integrity.
                                </p>
                            </section>
                            <section>
                                <h2 className="text-2xl font-bold mb-4">Encryption</h2>
                                <p className="text-slate-600">
                                    All data is encrypted in transit using TLS 1.3 and at rest using AES-256. We use enterprise-grade key management services to protect your information.
                                </p>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </PageWrapper >
    );
}
