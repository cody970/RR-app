"use client";

import Link from "next/link";
import { ArrowRight, Zap, Shield, Users } from "lucide-react";

const stats = [
  { value: "$47M+", label: "Royalties recovered" },
  { value: "2,300+", label: "Active publishers" },
  { value: "10M+", label: "Tracks audited" },
  { value: "99.9%", label: "Match accuracy" },
];

/**
 * High-impact final CTA section for the landing page.
 * Replaces the old plain "Start Free Trial" CTA.
 */
export function CtaSection() {
  return (
    <section className="relative py-28 md:py-40 overflow-hidden bg-slate-950">
      {/* Background elements */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="relative container mx-auto max-w-5xl px-4 sm:px-6 z-10">
        {/* Social proof stats row */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 md:gap-x-16 mb-14 md:mb-18">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                {value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Headline */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter leading-[0.95] mb-6">
            Stop leaving your
            <br />
            <span className="text-gradient-gold">royalties behind.</span>
          </h2>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            The average publisher who runs their first RoyaltyRadar audit recovers
            over <span className="text-white font-black">$18,400</span> in the first 90
            days. Start for free in under 2 minutes.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 h-16 px-10 rounded-2xl bg-white text-slate-900 text-sm font-black uppercase tracking-wider hover:bg-slate-100 active:scale-[0.98] transition-all shadow-2xl shadow-white/10"
          >
            Start for Free — No Card Needed
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 h-16 px-8 rounded-2xl border border-white/10 text-white/80 text-sm font-bold hover:border-white/30 hover:text-white transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Trust signals below CTA */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            SOC 2 Type II Certified
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Setup in &lt; 2 minutes
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            2,300+ publishers trust us
          </span>
        </div>
      </div>
    </section>
  );
}
