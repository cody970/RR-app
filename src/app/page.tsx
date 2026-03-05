import Link from "next/link";
import { ArrowRight, Music, Shield, Zap, Search, FileCheck, DollarSign, Upload, ScanSearch, TrendingUp, Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

import { HeroVisualizer } from "@/components/landing/hero-visualizer";
import { GlowingEffectDemo } from "@/components/landing/glowing-features";

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
            <span className="text-xl font-bold text-gradient-gold">
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
              <span className="text-gradient-gold">
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

          {/* Dashboard Preview / Stats */}
          <div className="mt-16 pt-10 border-t border-slate-200 flex flex-wrap justify-center gap-12 sm:gap-24 animate-slide-up delay-400">
            <div className="text-center group">
              <div className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">10M+</div>
              <div className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">Tracks Audited</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-black text-gradient-gold group-hover:scale-110 transition-transform">$2.4M</div>
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

          <GlowingEffectDemo />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-50 relative">
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />
        <div className="container mx-auto max-w-5xl px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 mb-6">
              Simple Process
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900">How It Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Three simple steps to recover your missing royalties.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Import Your Catalog",
                description: "Upload your works and recordings via CSV, CWR files, or connect directly to your distributor.",
              },
              {
                step: "02",
                icon: ScanSearch,
                title: "AI Audits Everything",
                description: "Our engine cross-references millions of data points across global societies, DSPs, and registration databases.",
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Recover Revenue",
                description: "Get actionable findings with one-click dispute filing, metadata healing, and recovery tracking.",
              },
            ].map((item, i) => (
              <div key={item.step} className={`relative group animate-slide-up opacity-0 delay-${(i + 1) * 100}`}>
                <div className="p-8 rounded-2xl bg-white border border-slate-200/50 hover:border-amber-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 glass-card h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-4xl font-black text-gradient-gold opacity-30">{item.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/10 border border-amber-200/50 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Showcase Section */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-800/20 backdrop-blur-sm opacity-10"></div>
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
          <div className="lg:w-1/2 relative w-full h-[300px] md:h-[400px]">
            {/* Glow effect kept as a visual element */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500/30 to-yellow-500/10 blur-3xl rounded-[3rem] animate-pulse-glow"></div>
            <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-800/50 backdrop-blur-md group flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                <Shield className="w-12 h-12 text-amber-500" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0VjBoLTJ2MTRIMFYxNmgzNHYtMnptMCAxNkg2MHYtMkgzNnYxNEgzNHYtMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

        <div className="container mx-auto max-w-4xl px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Ready to recover your royalties?
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light">
            Join hundreds of publishers and labels who&apos;ve recovered millions in missing royalties with RoyaltyRadar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 text-base bg-white text-slate-900 hover:bg-slate-100 rounded-xl shadow-xl shadow-black/10 hover:scale-105 transition-all font-semibold">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-10 text-base border-white/30 text-white hover:bg-white/10 rounded-xl transition-all">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 border-t border-slate-200 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-4 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">SOC 2 Type II Certified</h4>
                <p className="text-sm">Bank-grade security for your catalog data</p>
              </div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-4 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400/15 to-slate-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Lightning Fast</h4>
                <p className="text-sm">Process 100k+ rows in under 2 minutes</p>
              </div>
            </div>
            <div className="w-px h-12 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-4 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Live DSP Analytics</h4>
                <p className="text-sm">Direct integration with Spotify & Apple Music</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-amber-500/20">
                  RR
                </div>
                <span className="text-lg font-bold text-white">RoyaltyRadar</span>
              </div>
              <p className="text-sm leading-relaxed">
                AI-powered music catalog audit & revenue recovery platform.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <Twitter className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <Github className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="#features" className="text-sm hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="text-sm hover:text-white transition-colors">How it Works</Link></li>
                <li><Link href="/register" className="text-sm hover:text-white transition-colors">Free Trial</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Security</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} RoyaltyRadar. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Built for music publishers, labels & rights holders worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
