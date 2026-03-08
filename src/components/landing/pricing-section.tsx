"use client";

import Link from "next/link";
import { Check, X, ArrowRight, Zap, Star, Gift } from "lucide-react";

export type PlanName = "Free" | "Starter" | "Pro" | "Enterprise";

interface Tier {
  name: PlanName;
  price: string;
  period: string;
  description: string;
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
  features: string[];
  limitations?: string[];
}

export const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Start exploring your catalog with zero commitment.",
    cta: "Get Started Free",
    ctaHref: "/register",
    highlighted: false,
    badge: "No Credit Card",
    features: [
      "Up to 50 works & recordings",
      "1 statement import / month",
      "Basic metadata audit",
      "ISRC lookup tool",
      "Community support",
    ],
    limitations: [
      "No AI audit engine",
      "No society registrations",
      "No Content ID monitoring",
    ],
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For independent artists and small catalog owners.",
    cta: "Start 14-Day Trial",
    ctaHref: "/register",
    highlighted: false,
    features: [
      "Up to 500 works & recordings",
      "Advanced metadata auditing",
      "CSV & CWR import",
      "Unlimited statement ingestion",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For established publishers managing large catalogs.",
    cta: "Start 14-Day Trial",
    ctaHref: "/register",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Unlimited works & recordings",
      "Advanced AI audit engine",
      "PRO / Society registrations",
      "Content ID monitoring",
      "MLC & sync licensing",
      "Real-time DSP analytics",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For labels and large publishers at scale.",
    cta: "Contact Sales",
    ctaHref: "/register",
    highlighted: false,
    features: [
      "Everything in Pro",
      "Dedicated infrastructure",
      "Custom integrations & API",
      "SLA guarantees",
      "SSO & advanced RBAC",
      "Dedicated account manager",
      "Custom reporting",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-28 md:py-36 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/80 border border-indigo-100 text-[10px] font-black text-indigo-600 mb-6 uppercase tracking-[0.2em]">
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            Simple, Transparent Pricing
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-5">
            Start free. Scale when ready.
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-xl font-medium leading-relaxed">
            The Free plan is free forever. Paid plans include a 14-day trial with no
            credit card required.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 xl:grid-cols-4 items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl p-6 sm:p-7 transition-all duration-300 ${
                tier.highlighted
                  ? "bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-900/30 xl:scale-105"
                  : "bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                      tier.name === "Free"
                        ? "bg-emerald-500 text-white shadow-emerald-500/30"
                        : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-indigo-500/30"
                    }`}
                  >
                    {tier.name === "Free" ? (
                      <Gift className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Star className="w-3 h-3" aria-hidden="true" />
                    )}
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3
                className={`text-xs font-black uppercase tracking-[0.15em] mb-2 ${
                  tier.highlighted ? "text-indigo-400" : "text-slate-500"
                }`}
              >
                {tier.name}
              </h3>

              {/* Price */}
              <div className="flex items-end gap-1 mb-3">
                <span
                  className={`text-4xl sm:text-5xl font-black tracking-tighter leading-none ${
                    tier.highlighted ? "text-white" : "text-slate-900"
                  }`}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    className={`text-sm font-medium mb-1 ${
                      tier.highlighted ? "text-slate-400" : "text-slate-400"
                    }`}
                  >
                    {tier.period}
                  </span>
                )}
              </div>

              <p
                className={`text-sm font-medium leading-relaxed mb-5 ${
                  tier.highlighted ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {tier.description}
              </p>

              <div
                className={`w-full h-px mb-5 ${
                  tier.highlighted ? "bg-white/10" : "bg-slate-100"
                }`}
              />

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tier.highlighted ? "bg-indigo-500/20" : "bg-emerald-500/10"
                      }`}
                    >
                      <Check
                        className={`h-2.5 w-2.5 ${
                          tier.highlighted ? "text-indigo-400" : "text-emerald-600"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        tier.highlighted ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {f}
                    </span>
                  </li>
                ))}
                {tier.limitations?.map((l) => (
                  <li key={l} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-slate-100">
                      <X className="h-2.5 w-2.5 text-slate-400" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-medium text-slate-400">{l}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={tier.ctaHref}>
                <span
                  className={`flex w-full items-center justify-center gap-2 h-11 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                    tier.highlighted
                      ? "bg-white text-slate-900 hover:bg-slate-100 shadow-md"
                      : tier.name === "Free"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                        : "border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-400 mt-12 font-medium">
          Free plan is free forever · Paid plans include 14-day trial · No credit card
          required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
