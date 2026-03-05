import Link from "next/link";
import { ArrowRight, Music, Shield, Zap, Search, FileCheck, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

import { HeroVisualizer } from "@/components/landing/hero-visualizer";
import { GlowingEffectDemo } from "@/components/landing/glowing-features";
import { MobileNav } from "@/components/landing/mobile-nav";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden relative selection:bg-amber-500/20">
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
            <Link href="#how-it-works" className="hover:text-slate-900 transition-colors">How it Works</Link>
            <Link href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Log in
            </Link>
            <Link href="/register" className="hidden sm:inline">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all h-9 px-5">
                Start Free Trial
              </Button>
            </Link>
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
            <Link href="#demo" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl transition-all glass-card">
                View Interactive Demo
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

      {/* Feature Grid */}
      <section id="features" className="py-16 sm:py-24 bg-white relative">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 text-slate-900">Total Catalog Visibility</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-base sm:text-lg px-2">Everything you need to clean your catalog and maximize your global royalty collections.</p>
          </div>

          <GlowingEffectDemo />
        </div>
      </section>

      {/* Visual Showcase Section */}
      <section className="py-20 sm:py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-800/20 backdrop-blur-sm opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/50"></div>

        <div className="container mx-auto max-w-6xl px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row items-center gap-10 sm:gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-medium text-amber-400 mb-6">
              <Shield className="w-3.5 h-3.5" /> Enterprise Grade
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">Secure your music<br />royalties in the vault.</h2>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10">
              Your royalty data is your most valuable asset. We protect it with enterprise-level encryption, strict access controls, and immutable audit trails so you can recover revenue with complete peace of mind.
            </p>
            <ul className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
              <li className="flex items-center gap-4 text-slate-300 text-sm sm:text-base">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
                <span>SOC 2 Type II Certified Infrastructure</span>
              </li>
              <li className="flex items-center gap-4 text-slate-300 text-sm sm:text-base">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                </div>
                <span>Immutable, Cryptographic Audit Logs</span>
              </li>
              <li className="flex items-center gap-4 text-slate-300 text-sm sm:text-base">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span>Real-Time Anomaly & Fraud Detection</span>
              </li>
            </ul>
            <Link href="/register">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-8 shadow-xl shadow-white/5 transition-all w-full sm:w-auto">
                Learn About Security
              </Button>
            </Link>
          </div>
          <div className="lg:w-1/2 relative w-full h-[250px] sm:h-[300px] md:h-[400px]">
            {/* Glow effect kept as a visual element */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500/30 to-yellow-500/10 blur-3xl rounded-[3rem] animate-pulse-glow"></div>
            <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-800/50 backdrop-blur-md group flex items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/20 flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 sm:py-20 border-t border-slate-200 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="flex flex-col gap-8 sm:gap-0 sm:flex-row items-center justify-between">
            <div className="flex items-center gap-4 text-slate-500">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">SOC 2 Type II Certified</h4>
                <p className="text-xs sm:text-sm">Bank-grade security for your catalog data</p>
              </div>
            </div>
            <div className="w-full sm:w-px h-px sm:h-12 bg-slate-200" />
            <div className="flex items-center gap-4 text-slate-500">
              <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">Lightning Fast</h4>
                <p className="text-xs sm:text-sm">Process 100k+ rows in under 2 minutes</p>
              </div>
            </div>
            <div className="w-full sm:w-px h-px sm:h-12 bg-slate-200" />
            <div className="flex items-center gap-4 text-slate-500">
              <Music className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">Live DSP Analytics</h4>
                <p className="text-xs sm:text-sm">Direct integration with Spotify & Apple Music</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
