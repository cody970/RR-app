"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn, ScaleIn } from "@/components/landing/scroll-animations";

export function CtaSection() {
  return (
    <section className="py-24 md:py-36 bg-[#000000]">
      <div className="mx-auto max-w-[980px] px-6 text-center">
        <FadeIn>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-5">
            Start recovering royalties today.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-lg text-[#86868b] max-w-xl mx-auto mb-10">
            The average publisher recovers over $18,400 in their first 90 days.
            Free plan available — no credit card required.
          </p>
        </FadeIn>

        <ScaleIn delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-green-500 text-black text-sm font-medium hover:bg-green-400 transition-colors"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center h-12 px-7 rounded-full border border-[#424245] text-[#d1d1d6] text-sm font-medium hover:border-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </ScaleIn>

        <FadeIn delay={0.35}>
          <p className="text-xs text-[#6e6e73] mt-8">
            Free plan forever · 14-day trial on paid plans · Cancel anytime
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
