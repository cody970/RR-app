"use client";

import {
  FadeIn,
  StaggerChildren,
  StaggerItem,
} from "@/components/landing/scroll-animations";

const testimonials = [
  {
    quote:
      "We ran RoyaltyRadar on our back catalog and found $140K in ISWC mapping errors we'd never have caught manually. The audit paid for itself in the first week.",
    name: "Sarah Chen",
    role: "Senior Rights Manager",
    company: "Meridian Music Publishing",
    initials: "SC",
  },
  {
    quote:
      "Three of my biggest placements had duplicate ISRC codes — two years of SoundExchange income was sitting unmatched. Found it in minutes.",
    name: "James Okafor",
    role: "Independent Producer & Songwriter",
    company: "JO Music Group",
    initials: "JO",
  },
  {
    quote:
      "Content ID was claiming revenue on uploads we fully owned. RoyaltyRadar caught every false claim. We recovered 38% more YouTube revenue.",
    name: "Maria Santos",
    role: "Head of Digital Catalog",
    company: "Ritmo Latino Records",
    initials: "MS",
  },
  {
    quote:
      "The split sheet tracking alone is worth the subscription. Now every new session produces a signed record automatically.",
    name: "David Park",
    role: "Music Rights Attorney",
    company: "Park & Associates LLP",
    initials: "DP",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 md:py-36 bg-[#000000]">
      <div className="mx-auto max-w-[980px] px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-4">
              Real recoveries. Real money.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg text-[#86868b] max-w-xl mx-auto">
              What publishers and producers found when they finally looked.
            </p>
          </FadeIn>
        </div>

        {/* Testimonial grid */}
        <StaggerChildren className="grid gap-5 md:grid-cols-2" stagger={0.1}>
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
            <figure
              className="flex flex-col rounded-2xl bg-[#1d1d1f] p-7 transition-all duration-300 hover:bg-[#2d2d2f] h-full"
            >
              <blockquote className="flex-1">
                <p className="text-[15px] text-[#d1d1d6] leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-[#424245]">
                <div className="w-9 h-9 rounded-full bg-[#2d2d2f] flex items-center justify-center text-[11px] font-semibold text-[#86868b] flex-shrink-0">
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#f5f5f7] leading-tight truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-[#86868b] truncate">
                    {t.role}, {t.company}
                  </p>
                </div>
              </figcaption>
            </figure>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
