"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, Star } from "lucide-react";
import { SparkButton } from "@/components/spark/spark-button";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For independent artists and small catalog owners just getting started.",
    cta: "Start Free Trial",
    ctaHref: "/register",
    highlighted: false,
    features: [
      "Up to 500 works & recordings",
      "Basic metadata auditing",
      "CSV & CWR import",
      "Statement ingestion",
      "Email support",
    ],
    unavailable: [],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For established publishers and administrators managing large catalogs.",
    cta: "Start Free Trial",
    ctaHref: "/register",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Unlimited works & recordings",
      "Advanced AI audit engine",
      "PRO/Society registrations",
      "Content ID monitoring",
      "MLC & sync licensing",
      "Real-time DSP analytics",
      "Priority support",
    ],
    unavailable: [],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For labels and large publishers requiring dedicated infrastructure.",
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
    unavailable: [],
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="py-32 bg-white relative overflow-hidden"
    >
      {/* Subtle top border gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <div className="container mx-auto max-w-6xl px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/80 border border-indigo-100 text-[10px] font-black text-indigo-600 mb-6 uppercase tracking-[0.2em]">
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            Simple Pricing
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6">
            Invest in your catalog.
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-xl font-medium leading-relaxed">
            Every plan includes a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 ${
                tier.highlighted
                  ? "bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-900/30 scale-[1.02] md:scale-105"
                  : "bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
              }`}
            >
              {/* Popular badge */}
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30">
                    <Star className="w-3 h-3" aria-hidden="true" />
                    {tier.badge}
                  </div>
                </div>
              )}

              {/* Plan name */}
              <div className="mb-6">
                <h3
                  className={`text-sm font-black uppercase tracking-[0.15em] mb-2 ${
                    tier.highlighted ? "text-indigo-400" : "text-slate-500"
                  }`}
                >
                  {tier.name}
                </h3>
                <div className="flex items-end gap-1 mb-3">
                  <span
                    className={`text-5xl font-black tracking-tighter leading-none ${
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
                  className={`text-sm font-medium leading-relaxed ${
                    tier.highlighted ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {tier.description}
                </p>
              </div>

              {/* Divider */}
              <div
                className={`w-full h-px mb-6 ${
                  tier.highlighted ? "bg-white/10" : "bg-slate-100"
                }`}
              />

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tier.highlighted
                          ? "bg-indigo-500/20"
                          : "bg-emerald-500/10"
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          tier.highlighted ? "text-indigo-400" : "text-emerald-600"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        tier.highlighted ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={tier.ctaHref}>
                {tier.highlighted ? (
                  <SparkButton
                    variant="ghost"
                    size="lg"
                    className="w-full h-13 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-2xl text-sm uppercase tracking-wider"
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                  </SparkButton>
                ) : (
                  <SparkButton
                    variant="tertiary"
                    size="lg"
                    className="w-full h-13 font-black rounded-2xl text-sm uppercase tracking-wider border-slate-200 hover:border-indigo-300"
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                  </SparkButton>
                )}
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-slate-400 mt-12 font-medium">
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
