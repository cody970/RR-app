"use client";

import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import {
  FadeIn,
  StaggerChildren,
  StaggerItem,
} from "@/components/landing/scroll-animations";

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
    <section id="pricing" className="py-24 md:py-36 bg-[#000000]">
      <div className="mx-auto max-w-[1120px] px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-4">
              Start free. Scale when ready.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg text-[#86868b] max-w-xl mx-auto">
              Free plan forever. 14-day trial on paid plans, no credit card required.
            </p>
          </FadeIn>
        </div>

        {/* Cards */}
        <StaggerChildren className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 items-start" stagger={0.1}>
          {TIERS.map((tier) => (
            <StaggerItem key={tier.name}>
              <div
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 h-full ${
                  tier.highlighted
                    ? "bg-[#1d1d1f] ring-1 ring-green-500/40"
                    : "bg-[#1d1d1f] hover:bg-[#2d2d2f]"
                }`}
              >
              {/* Badge */}
              {tier.badge && (
                <span className="inline-flex self-start items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-green-500/10 text-green-400 mb-4">
                  {tier.badge}
                </span>
              )}

              {/* Plan name */}
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#86868b] mb-2">
                {tier.name}
              </h3>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-semibold tracking-tight text-[#f5f5f7]">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-[#86868b]">{tier.period}</span>
                )}
              </div>

              <p className="text-sm text-[#86868b] leading-relaxed mb-5">
                {tier.description}
              </p>

              <div className="w-full h-px mb-5 bg-[#424245]" />

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-xs text-[#d1d1d6]">{f}</span>
                  </li>
                ))}
                {tier.limitations?.map((l) => (
                  <li key={l} className="flex items-start gap-2.5">
                    <X className="h-4 w-4 text-[#6e6e73] flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-xs text-[#6e6e73]">{l}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={tier.ctaHref}>
                <span
                  className={`flex w-full items-center justify-center gap-2 h-10 rounded-full text-sm font-medium transition-colors ${
                    tier.highlighted || tier.name === "Free"
                      ? "bg-green-500 text-black hover:bg-green-400"
                      : "bg-[#2d2d2f] text-[#d1d1d6] hover:bg-[#3d3d3f]"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <p className="text-center text-xs text-[#6e6e73] mt-10">
          All prices in USD. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
