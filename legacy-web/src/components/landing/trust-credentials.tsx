"use client";

import { motion } from "framer-motion";
import { Shield, Lock, FileCheck, CheckCircle, Award, Database } from "lucide-react";

const credentials = [
    { name: "SOC 2 Type II", Icon: Shield, detail: "Audit in progress" },
    { name: "GDPR Compliant", Icon: CheckCircle, detail: "Global Data Protection" },
    { name: "AES-256 Encryption", Icon: Lock, detail: "Military Grade" },
    { name: "Direct DSP APIs", Icon: Database, detail: "Verified Connections" },
    { name: "DMCA Compliance", Icon: FileCheck, detail: "IP Protection" },
    { name: "SSL Secure", Icon: Award, detail: "Encrypted Transit" },
];

export const TrustCredentials = () => {
    return (
        <div className="py-20 bg-slate-50 border-y border-slate-200 relative overflow-hidden">
            <div className="container mx-auto px-6 text-center mb-16 relative z-10">
                <p className="text-amber-600 font-bold text-sm tracking-widest uppercase mb-4">Enterprise-Ready Infrastructure</p>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Compliance & Security Standards</h2>
            </div>

            <div className="flex gap-8 hover:[animation-play-state:paused]">
                <motion.div
                    animate={{ x: [0, -1200] }}
                    transition={{
                        duration: 35,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="flex gap-12 items-center whitespace-nowrap"
                >
                    {[...credentials, ...credentials, ...credentials].map((cred, index) => (
                        <div
                            key={index}
                            className="bg-white px-8 py-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 group hover:border-amber-500/30 transition-all duration-300 min-w-[280px]"
                        >
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                                <cred.Icon className="w-6 h-6 text-slate-600 group-hover:text-amber-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-0.5">{cred.name}</h4>
                                <p className="text-xs text-slate-500 font-medium tracking-wide">{cred.detail}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Gradient masks for smooth fading */}
            <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-slate-50 to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-slate-50 to-transparent z-10" />
        </div>
    );
};
