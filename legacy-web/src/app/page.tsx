import Link from "next/link";
import { ArrowRight, Music, Shield, Zap, Search, FileCheck, DollarSign, Database, Globe, BarChart3, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

import { HeroVisualizer } from "@/components/landing/hero-visualizer";
import { GlowingEffectDemo } from "@/components/landing/glowing-features";
import { MobileNav } from "@/components/landing/mobile-nav";
import { BentoGrid, BentoCard } from "@/components/landing/bento-grid";
import { PricingSection } from "@/components/landing/pricing-section";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQSection } from "@/components/landing/faq-section";
import { RevenueCalculator } from "@/components/landing/revenue-calculator";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { motion, AnimatePresence } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const features = [
  {
    Icon: Globe,
    name: "Global Data Scanning",
    description: "We monitor millions of global data points across every major DSP and collection society.",
    href: "/features",
    cta: "Learn more",
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
    background: <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />,
  },
  {
    Icon: Database,
    name: "Catalog Enrichment",
    description: "Automatically match ISRCs to ISWCs and identify missing metadata in seconds.",
    href: "/features",
    cta: "Explore metadata",
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2",
    background: <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />,
  },
  {
    Icon: Search,
    name: "Conflict Resolution",
    description: "Find and resolve split conflicts before they turn into black box revenue.",
    href: "/features",
    cta: "Resolve splits",
    className: "lg:col-start-3 lg:col-end-5 lg:row-start-1 lg:row-end-2",
    background: <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />,
  },
  {
    Icon: BarChart3,
    name: "Revenue Analytics",
    description: "Real-time insights into your top earners and projected recovery amounts.",
    href: "/dashboard",
    cta: "View dashboard",
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3",
    background: <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />,
  },
  {
    Icon: Lock,
    name: "Vault Security",
    description: "Enterprise-grade encryption for your most valuable publishing assets.",
    href: "/security",
    cta: "Security whitepaper",
    className: "lg:col-start-3 lg:col-end-5 lg:row-start-2 lg:row-end-3",
    background: <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent" />,
  },
];

export default function LandingPage() {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden relative selection:bg-amber-500/20 transition-colors duration-500">
        {/* Dark grid background overlay */}
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />

        {/* Ambient animated gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-slate-400/10 rounded-full blur-[120px] animate-pulse-glow delay-300" />

        {/* Premium Header */}
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-amber-500/10 transition-all duration-300">
          <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-amber-500/20">
                RR
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 bg-clip-text text-transparent animate-shimmer">
                RoyaltyRadar
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <Link href="#features" className="hover:text-slate-900 transition-colors">Features</Link>
              <Link href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-slate-900 transition-colors">App</Link>
            </nav>
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
                Log in
              </Link>
              <Link href="/register" className="hidden sm:inline">
                <Button className="bg-slate-900 dark:bg-slate-50 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 text-white rounded-xl shadow-lg hover:shadow-xl transition-all h-9 px-5">
                  Start Free Trial
                </Button>
              </Link>
              <ThemeToggle />
              {/* Mobile hamburger menu */}
              <MobileNav />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-48 md:pb-32 px-4 sm:px-6">
          <HeroVisualizer />
          <div className="container mx-auto max-w-5xl text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 mb-6 sm:mb-8 animate-slide-up">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              AI-Powered Royalty Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 sm:mb-8 animate-slide-up delay-100 text-slate-900">
              Stop leaving your <br className="hidden sm:block" />
              <span className="relative inline-block mt-2">
                <span className="bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                  royalties
                </span>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-transparent rounded-full opacity-50" />
              </span> on the table.
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-12 animate-slide-up delay-200 leading-relaxed font-light px-2">
              The ultimate catalog audit and revenue recovery platform. We scan millions of global data points to identify missing ISRC/ISWCs, split conflicts, and black box revenue.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up delay-300 px-2">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-all">
                  Connect Catalog Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#pricing" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl transition-all glass-card">
                  View Pricing
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-200 flex flex-col sm:flex-row flex-wrap justify-center gap-8 sm:gap-12 md:gap-24 animate-slide-up delay-400">
              <div className="text-center group">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">10M+</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Tracks Audited</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl sm:text-3xl font-black text-amber-600 group-hover:scale-110 transition-transform">$2.4M</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Recovered</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">99.2%</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Match Accuracy</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Marquee */}
        <motion.div {...fadeInUp}>
          <LogoMarquee />
        </motion.div>

        {/* Feature Bento Grid */}
        <section id="features" className="py-24 bg-white relative">
          <motion.div
            className="container mx-auto px-6 relative z-10"
            {...fadeInUp}
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900">Precision Catalog Auditing</h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg px-2">
                Advanced machine learning meets deep metadata analysis to clean your collection and secure your income.
              </p>
            </div>

            <BentoGrid className="max-w-6xl mx-auto">
              {features.map((feature, idx) => (
                <BentoCard key={idx} {...feature} />
              ))}
            </BentoGrid>
          </motion.div>
        </section>

        {/* Interactive Mock Auditor Demo */}
        <motion.div {...fadeInUp}>
          <InteractiveDemo />
        </motion.div>

        {/* Revenue Calculator */}
        <motion.div {...fadeInUp}>
          <RevenueCalculator />
        </motion.div>

        {/* Interactive Feature Demo (Placeholder for premium look) */}
        <section className="py-24 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-800/20 backdrop-blur-sm opacity-10"></div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-medium text-amber-400 mb-6">
                  <Zap className="w-3.5 h-3.5" /> High Performance
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">Lightning fast audits.<br />Global recovery.</h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  Don't wait for quarterly statements to find errors. RoyaltyRadar audits your entire global catalog in real-time, identifying discrepancies the moment they appear.
                </p>
                <div className="space-y-4">
                  {[
                    "Automated ISRC/ISWC Cross-Referencing",
                    "Global Black Box Revenue Identification",
                    "Direct Conflict Dispute Filings",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-1/2 relative w-full aspect-square md:aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 glass">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent opacity-50" />
                <div className="p-8 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="h-2 w-32 rounded-full bg-slate-700/50" />
                  </div>
                  <div className="flex-1 mt-8 space-y-4">
                    <div className="h-8 w-3/4 rounded-lg bg-slate-800/80 animate-pulse" />
                    <div className="h-32 w-full rounded-xl bg-slate-800/40 border border-slate-700/50" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 rounded-xl bg-amber-500/10 border border-amber-500/20" />
                      <div className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/50" />
                      <div className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <motion.div {...fadeInUp}>
          <Testimonials />
        </motion.div>

        {/* Pricing Section */}
        <motion.div id="pricing" {...fadeInUp}>
          <PricingSection />
        </motion.div>

        {/* FAQ Section */}
        <motion.div {...fadeInUp}>
          <FAQSection />
        </motion.div>

        {/* Waitlist Section */}
        <motion.div {...fadeInUp}>
          <WaitlistSection />
        </motion.div>

        {/* Visual Showcase Section (Refined) */}
        <section className="py-32 bg-slate-50 relative overflow-hidden border-t border-slate-200">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row items-center gap-10 sm:gap-16">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-600 mb-6">
                <Shield className="w-3.5 h-3.5" /> Security First
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight">Bank-grade security<br />for your IP.</h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
                Your royalty data is encrypted at rest and in transit. We use SOC-2 compliant infrastructure to ensure your intellectual property and revenue details remain private and protected.
              </p>
              <ul className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
                <li className="flex items-center gap-4 text-slate-700">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="font-medium">SOC 2 Type II Certified Infrastructure</span>
                </li>
                <li className="flex items-center gap-4 text-slate-700">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="font-medium">Direct DSP API Connections</span>
                </li>
              </ul>
            </div>
            <div className="lg:w-1/2 relative w-full h-[300px] md:h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent blur-3xl" />
              <div className="relative h-full w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white bg-white/50 backdrop-blur-xl flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 blur-2xl animate-pulse rounded-full" />
                  <Database className="w-24 h-24 text-amber-500 relative z-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 py-16 text-slate-400">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12 border-b border-slate-800 pb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-xs font-black text-white">
                    RR
                  </div>
                  <span className="text-xl font-bold text-white">RoyaltyRadar</span>
                </div>
                <p className="text-sm leading-relaxed">
                  Empowering artists and publishers to recover their missing global royalties through advanced AI auditing.
                </p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-6">Product</h4>
                <ul className="space-y-4 text-sm">
                  <li><Link href="#features">Features</Link></li>
                  <li><Link href="#pricing">Pricing</Link></li>
                  <li><Link href="/dashboard">App Dashboard</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-6">Resources</h4>
                <ul className="space-y-4 text-sm">
                  <li><Link href="/docs">Documentation</Link></li>
                  <li><Link href="/api">API Documentation</Link></li>
                  <li><Link href="/support">Support Center</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-6">Legal</h4>
                <ul className="space-y-4 text-sm">
                  <li><Link href="/privacy">Privacy Policy</Link></li>
                  <li><Link href="/terms">Terms of Service</Link></li>
                  <li><Link href="/security">Security</Link></li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs uppercase tracking-widest font-semibold">
              <p>© 2026 RoyaltyRadar. All rights reserved.</p>
              <div className="flex gap-8">
                <Link href="#">Twitter</Link>
                <Link href="#">LinkedIn</Link>
                <Link href="#">GitHub</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageWrapper>
  );
}
