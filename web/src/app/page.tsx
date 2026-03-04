import Link from "next/link";
import { ArrowRight, Music, Shield, Zap, Search, FileCheck, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

import { HeroVisualizer } from "@/components/landing/hero-visualizer";

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
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
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
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Log in
            </Link>
            <Link href="/register">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all h-9 px-5">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <HeroVisualizer />
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 mb-8 animate-slide-up">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            AI-Powered Royalty Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-slide-up delay-100 text-slate-900">
            Stop leaving your <br className="hidden md:block" />
            <span className="relative inline-block mt-2">
              <span className="bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                royalties
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-transparent rounded-full opacity-50" />
            </span> on the table.
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12 animate-slide-up delay-200 leading-relaxed font-light">
            The ultimate catalog audit and revenue recovery platform. We scan millions of global data points to identify missing ISRC/ISWCs, split conflicts, and black box revenue.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-300">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-all">
                Connect Catalog Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl transition-all glass-card">
                View Interactive Demo
              </Button>
            </Link>
          </div>

          {/* Hero Dashboard Image */}
          <div className="mt-16 relative max-w-5xl mx-auto animate-slide-up delay-300 perspective-1000">
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-50 to-transparent z-10" />
            <div className="relative rounded-xl border border-slate-200/50 bg-slate-900 p-2 shadow-2xl overflow-hidden ring-1 ring-slate-900/5 group transform hover:-translate-y-2 hover:shadow-3xl transition-all duration-500">
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src="/hero-dashboard.png"
                alt="RoyaltyRadar Dashboard"
                className="w-full h-auto rounded-lg object-cover ring-1 ring-white/10"
              />
            </div>
          </div>

          {/* Dashboard Preview / Stats */}
          <div className="mt-16 pt-10 border-t border-slate-200 flex flex-wrap justify-center gap-12 sm:gap-24 animate-slide-up delay-400">
            <div className="text-center group">
              <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">10M+</div>
              <div className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Tracks Audited</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-black text-amber-600 group-hover:scale-110 transition-transform">$2.4M</div>
              <div className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Recovered</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">99.2%</div>
              <div className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Match Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 bg-white relative">
        <div className="container mx-auto max-w-6xl px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900">Total Catalog Visibility</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Everything you need to clean your catalog and maximize your global royalty collections.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-8 group border border-slate-200 hover:border-amber-200 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 p-[1px] mb-6 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">Deep Metadata Audits</h3>
              <p className="text-slate-500 leading-relaxed">
                Automatically cross-reference your catalog against societies, DSPs, and global databases to find missing ISRC and ISWC linkages.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-8 group border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 p-[1px] mb-6 shadow-lg shadow-slate-500/20 group-hover:scale-110 transition-transform">
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-800 transition-colors">Dispute Automation</h3>
              <p className="text-slate-500 leading-relaxed">
                Instantly generate and file CWR compliant dispute letters for split conflicts and under-claims across all major collection societies.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-8 group border border-slate-200 hover:border-amber-200 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 p-[1px] mb-6 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">Black Box Recovery</h3>
              <p className="text-slate-500 leading-relaxed">
                Identify unclaimed royalties sitting in society black boxes by matching unlinked DSP streaming data to your composition rights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Showcase Section */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/music-vault.png')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/50"></div>

        <div className="container mx-auto max-w-6xl px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-medium text-amber-400 mb-6">
              <Shield className="w-3.5 h-3.5" /> Enterprise Grade
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">Secure your music<br />royalties in the vault.</h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              Your royalty data is your most valuable asset. We protect it with enterprise-level encryption, strict access controls, and immutable audit trails so you can recover revenue with complete peace of mind.
            </p>
            <ul className="space-y-5 mb-10">
              <li className="flex items-center gap-4 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
                <span>SOC 2 Type II Certified Infrastructure</span>
              </li>
              <li className="flex items-center gap-4 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                </div>
                <span>Immutable, Cryptographic Audit Logs</span>
              </li>
              <li className="flex items-center gap-4 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span>Real-Time Anomaly & Fraud Detection</span>
              </li>
            </ul>
            <Link href="/register">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-8 shadow-xl shadow-white/5 transition-all">
                Learn About Security
              </Button>
            </Link>
          </div>
          <div className="lg:w-1/2 relative w-full">
            {/* Glow effect behind image */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500/30 to-yellow-500/10 blur-3xl rounded-[3rem] animate-pulse-glow"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
              <img
                src="/music-vault.png"
                alt="Secure Royalty Vault"
                className="w-full h-auto object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 border-t border-slate-200 bg-slate-50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-4 text-slate-500">
              <Shield className="w-8 h-8 text-amber-500" />
              <div>
                <h4 className="font-bold text-slate-900">SOC 2 Type II Certified</h4>
                <p className="text-sm">Bank-grade security for your catalog data</p>
              </div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-4 text-slate-500">
              <Zap className="w-8 h-8 text-slate-400" />
              <div>
                <h4 className="font-bold text-slate-900">Lightning Fast</h4>
                <p className="text-sm">Process 100k+ rows in under 2 minutes</p>
              </div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-4 text-slate-500">
              <Music className="w-8 h-8 text-amber-600" />
              <div>
                <h4 className="font-bold text-slate-900">Live DSP Analytics</h4>
                <p className="text-sm">Direct integration with Spotify & Apple Music</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
