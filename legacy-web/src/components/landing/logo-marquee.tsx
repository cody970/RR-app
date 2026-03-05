"use client";

import { motion } from "framer-motion";
import { Music, Music2, Headphones, Play, Radio, Disc } from "lucide-react";

const partners = [
    { name: "Spotify", Icon: Music },
    { name: "Apple Music", Icon: Music2 },
    { name: "Amazon Music", Icon: Headphones },
    { name: "YouTube Music", Icon: Play },
    { name: "Tidal", Icon: Radio },
    { name: "Deezer", Icon: Disc },
];

export const LogoMarquee = () => {
    return (
        <div className="py-12 bg-slate-50 border-y border-slate-200 overflow-hidden relative">
            <div className="container mx-auto px-6 mb-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                    Trusted by artists on every major platform
                </p>
            </div>

            <div className="flex gap-12 hover:[animation-play-state:paused]">
                <motion.div
                    animate={{ x: [0, -1000] }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="flex gap-24 items-center whitespace-nowrap"
                >
                    {[...partners, ...partners, ...partners].map((partner, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-300 group"
                        >
                            <partner.Icon className="w-8 h-8 text-slate-600 group-hover:text-amber-500" />
                            <span className="text-xl font-bold text-slate-600 group-hover:text-slate-900">
                                {partner.name}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Gradient masks for smooth fading */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10" />
        </div>
    );
};
