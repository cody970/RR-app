import Link from "next/link";
import {
  Music,
  Shield,
  Zap,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Upload,
  ScanSearch,
  Search,
  Lock,
  Sparkles,
  Settings,
  Box,
} from "lucide-react";

import { LandingMobileNav } from "@/components/landing/landing-mobile-nav";
import { PricingSection } from "@/components/landing/pricing-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CtaSection } from "@/components/landing/cta-section";
import {
  FadeIn,
  BlurIn,
  StaggerChildren,
  StaggerItem,
  AnimatedCounter,
  TextReveal,
  ScrollProgress,
  ParallaxSection,
} from "@/components/landing/scroll-animations";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] overflow-hidden selection:bg-green-500/20">
      <ScrollProgress />

      {/* ── Apple-style Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(0,0,0,0.8)] backdrop-blur-xl backdrop-saturate-[1.8]">
        <div className="mx-auto max-w-[980px] px-4 sm:px-6 h-12 flex items-center justify-between">
          <LandingMobileNav />

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-[8px] font-black text-black">
              RR
            </div>
            <span className="text-sm font-semibold text-[#f5f5f7] tracking-tight hidden sm:inline">
              RoyaltyRadar
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-7 text-xs text-[#d1d1d6]">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#security" className="hover:text-white transition-colors">Security</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/login" className="text-xs text-[#d1d1d6] hover:text-white transition-colors hidden sm:inline">
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center h-7 px-3.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium hover:bg-white transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        <div className="mx-auto max-w-[980px] text-center">
          <FadeIn direction="up" distance={20} duration={0.8}>
            <p className="text-green-400 text-sm md:text-base font-medium tracking-wide mb-4">
              AI-Powered Music Royalty Platform
            </p>
          </FadeIn>

          <BlurIn delay={0.15}>
            <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-semibold tracking-[-0.025em] leading-[1.05] mb-6 bg-gradient-to-b from-[#f5f5f7] to-[#86868b] bg-clip-text text-transparent">
              Every royalty you&rsquo;re owed.
              <br />
              Found and recovered.
            </h1>
          </BlurIn>

          <FadeIn direction="up" delay={0.3} distance={20}>
            <p className="text-lg md:text-xl text-[#86868b] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              RoyaltyRadar scans your entire catalog against global rights databases, identifies missing revenue, and helps you recover it — automatically.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.45} distance={15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-green-500 text-black text-sm font-medium hover:bg-green-400 transition-colors"
              >
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-1 text-green-400 text-sm font-medium hover:text-green-300 transition-colors group"
              >
                See how it works
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Stats bar with animated counters */}
        <FadeIn direction="up" delay={0.6} distance={20}>
          <div className="mx-auto max-w-[980px] mt-24 pt-10 border-t border-[#1d1d1f] flex flex-wrap justify-center gap-10 sm:gap-20">
            <div className="text-center">
              <AnimatedCounter value={10} suffix="M+" className="text-3xl md:text-4xl font-semibold text-[#f5f5f7] tracking-tight" duration={2} />
              <div className="text-xs text-[#86868b] mt-1">Tracks Audited</div>
            </div>
            <div className="text-center">
              <AnimatedCounter value={2.4} prefix="$" suffix="M" className="text-3xl md:text-4xl font-semibold text-[#f5f5f7] tracking-tight" duration={2.5} />
              <div className="text-xs text-[#86868b] mt-1">Recovered</div>
            </div>
            <div className="text-center">
              <AnimatedCounter value={99.9} suffix="%" className="text-3xl md:text-4xl font-semibold text-[#f5f5f7] tracking-tight" duration={2} />
              <div className="text-xs text-[#86868b] mt-1">Match Accuracy</div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 md:py-36">
        <div className="mx-auto max-w-[980px] px-6 text-center mb-16 md:mb-24">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-4">
              Total Catalog Visibility.
            </h2>
          </FadeIn>
          <TextReveal
            text="Everything you need to clean your catalog and maximize your global royalty collections."
            className="text-lg md:text-xl text-[#86868b] max-w-2xl mx-auto"
          />
        </div>

        <StaggerChildren className="mx-auto max-w-[1120px] px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" stagger={0.08}>
          {[
            {
              icon: Search,
              title: "Deep Metadata Audits",
              description: "Cross-reference your catalog against societies, DSPs, and global databases to find missing ISRC and ISWC linkages.",
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              icon: Settings,
              title: "Dispute Automation",
              description: "Generate and file CWR-compliant dispute letters for split conflicts across all major collection societies.",
              color: "text-purple-400",
              bg: "bg-purple-500/10",
            },
            {
              icon: Lock,
              title: "Bank-Grade Security",
              description: "Enterprise encryption, SOC 2 compliance, and immutable cryptographic audit trails protect your data.",
              color: "text-green-400",
              bg: "bg-green-500/10",
            },
            {
              icon: Sparkles,
              title: "Anomaly Detection",
              description: "Identify unusual streaming patterns and potential royalty fraud with machine learning models.",
              color: "text-orange-400",
              bg: "bg-orange-500/10",
            },
            {
              icon: Box,
              title: "Black Box Recovery",
              description: "Find unclaimed royalties in society black boxes by matching unlinked DSP streaming data to your rights.",
              color: "text-pink-400",
              bg: "bg-pink-500/10",
            },
            {
              icon: Music,
              title: "DSP Analytics",
              description: "Real-time streaming analytics with direct integrations to Spotify, Apple Music, and more.",
              color: "text-cyan-400",
              bg: "bg-cyan-500/10",
            },
          ].map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group rounded-2xl bg-[#1d1d1f] p-7 transition-all duration-300 hover:bg-[#2d2d2f] h-full">
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-[#f5f5f7] mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#86868b] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 md:py-36 bg-[#000000]">
        <div className="mx-auto max-w-[980px] px-6">
          <div className="text-center mb-16 md:mb-24">
            <FadeIn>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-4">
                Three steps. Full recovery.
              </h2>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="text-lg text-[#86868b] max-w-xl mx-auto">
                Complex royalty auditing, distilled into a simple workflow.
              </p>
            </FadeIn>
          </div>

          <StaggerChildren className="grid md:grid-cols-3 gap-8" stagger={0.15}>
            {[
              {
                step: "1",
                icon: Upload,
                title: "Import",
                description: "Upload via CSV, CWR, or connect your distributor API. Your entire catalog in minutes.",
              },
              {
                step: "2",
                icon: ScanSearch,
                title: "Analyze",
                description: "Our AI cross-references millions of data points across global societies and DSPs.",
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Recover",
                description: "Actionable findings with one-click dispute filing and real-time recovery tracking.",
              },
            ].map((item) => (
              <StaggerItem key={item.step}>
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1d1d1f] mb-6 mx-auto md:mx-0">
                    <item.icon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-green-400 text-xs font-medium tracking-widest uppercase mb-2">
                    Step {item.step}
                  </div>
                  <h3 className="text-2xl font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-[#86868b] text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="py-24 md:py-36">
        <ParallaxSection className="mx-auto max-w-[980px] px-6" speed={0.08}>
          <div className="text-center mb-16">
            <FadeIn>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-4">
                Your data. Our vault.
              </h2>
            </FadeIn>
            <TextReveal
              text="Your royalty data is your most valuable asset. We protect it with banking-grade infrastructure."
              className="text-lg text-[#86868b] max-w-2xl mx-auto"
            />
          </div>

          <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.1}>
            {[
              { icon: Shield, title: "SOC 2 Type II", desc: "Independently certified compliance" },
              { icon: Lock, title: "Encryption", desc: "AES-256 at rest, TLS 1.3 in transit" },
              { icon: Zap, title: "Fraud Detection", desc: "Real-time anomaly monitoring" },
              { icon: Sparkles, title: "AI Validation", desc: "Automated data integrity checks" },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="rounded-2xl bg-[#1d1d1f] p-6 text-center transition-all duration-300 hover:bg-[#2d2d2f]">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
                    <item.icon className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-base font-semibold text-[#f5f5f7] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#86868b]">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </ParallaxSection>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <CtaSection />

      {/* ── Footer (Apple-style) ── */}
      <footer className="bg-[#1d1d1f] text-[#86868b]">
        <div className="mx-auto max-w-[980px] px-6 pt-5 pb-5">
          <p className="text-[11px] text-[#6e6e73] leading-relaxed pb-4 border-b border-[#424245]">
            RoyaltyRadar is designed to help rights holders identify and recover missing royalties. Results may vary depending on catalog completeness and data available from collection societies.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 py-7 border-b border-[#424245]">
            <div>
              <h4 className="text-xs font-semibold text-[#f5f5f7] mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="text-[11px] hover:text-[#f5f5f7] transition-colors">How It Works</Link></li>
                <li><Link href="#security" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#f5f5f7] mb-3">Account</h4>
              <ul className="space-y-2">
                <li><Link href="/register" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Get Started</Link></li>
                <li><Link href="/login" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#f5f5f7] mb-3">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/blog" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-[11px] hover:text-[#f5f5f7] transition-colors">About Us</Link></li>
                <li><Link href="#" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#f5f5f7] mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-[11px] hover:text-[#f5f5f7] transition-colors">Security Hub</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4">
            <p className="text-[11px] text-[#6e6e73]">
              Copyright © {new Date().getFullYear()} RR Systems Inc. All rights reserved.
            </p>
            <p className="text-[11px] text-[#6e6e73]">
              SOC 2 Type II Certified
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
