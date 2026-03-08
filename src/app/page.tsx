import Link from "next/link";
import {
  ArrowRight,
  Music,
  Shield,
  Zap,
  FileCheck,
  Upload,
  ScanSearch,
  TrendingUp,
  Github,
  Twitter,
  Linkedin,
  Bot
} from "lucide-react";
import { SparkButton } from "@/components/spark/spark-button";

import { HeroVisualizer } from "@/components/landing/hero-visualizer";
import { GlowingEffectDemo } from "@/components/landing/glowing-features";
import { HeroStarCta } from "@/components/landing/hero-star-cta";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden relative selection:bg-indigo-500/20">
      {/* Dark grid background overlay */}
      <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />

      {/* Ambient animated gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[120px] animate-pulse-glow delay-500" />

      {/* Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 transition-all duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl shadow-indigo-500/20 ring-1 ring-white/20 transition-transform group-hover:scale-110">
              RR
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              Royalty<span className="text-gradient-gold">Radar</span>
            </span>
          </div>
          <nav className="hidden lg:flex items-center gap-10 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <Link href="#features" className="hover:text-indigo-600 transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-indigo-600 transition-colors">Process</Link>
            <Link href="#security" className="hover:text-indigo-600 transition-colors">Security</Link>
          </nav>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">
              Log in
            </Link>
            <Link href="/register">
              <SparkButton variant="secondary" size="lg" className="w-full sm:w-auto h-11 rounded-2xl uppercase tracking-wider text-xs">
                Start Free Trial
              </SparkButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 md:pt-56 md:pb-40 px-6">
        <HeroVisualizer />
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/50 border border-indigo-100 text-[10px] font-black text-indigo-600 mb-10 animate-slide-up uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Next-Gen Royalty Intelligence
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-10 animate-slide-up delay-100 text-slate-900 leading-[0.95]">
            Stop leaving your <br className="hidden md:block" />
            <span className="relative inline-block mt-4">
              <span className="text-gradient-gold">
                royalties
              </span>
              <div className="absolute -bottom-4 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-transparent rounded-full" />
            </span> on the table.
          </h1>

          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-16 animate-slide-up delay-200 leading-relaxed font-medium">
            The ultimate catalog audit and revenue recovery platform for modern rights holders. We scan millions of global data points to heal your metadata and unlock hidden revenue.
          </p>

          <HeroStarCta />

          {/* Dashboard Preview / Stats */}
          <div className="mt-24 pt-12 border-t border-slate-100 flex flex-wrap justify-center gap-12 sm:gap-32 animate-slide-up delay-400">
            <div className="text-center group">
              <div className="text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">10M+</div>
              <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-black">Tracks Audited</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-black text-gradient-gold group-hover:scale-110 transition-transform">$2.4M</div>
              <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-black">Recovered</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-black text-slate-900 group-hover:text-violet-600 transition-colors">99.9%</div>
              <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-black">Match Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-32 bg-white relative">
        <div className="container mx-auto max-w-6xl px-6 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 text-slate-900 tracking-tighter">Total Catalog Visibility</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-xl font-medium leading-relaxed">Everything you need to clean your catalog and maximize your global royalty collections in one unified workspace.</p>
          </div>

          <GlowingEffectDemo />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 bg-slate-50/50 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />
        <div className="container mx-auto max-w-6xl px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 mb-6 uppercase tracking-widest">
                Simple Process
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">Three Steps to Recovery.</h2>
            </div>
            <p className="text-slate-500 text-xl font-medium max-w-md lg:text-right">We&apos;ve distilled complex royalty auditing into a streamlined three-step workflow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Import Catalog",
                description: "Upload your works via CSV, CWR files, or connect directly to your distributor API.",
              },
              {
                step: "02",
                icon: ScanSearch,
                title: "AI Analysis",
                description: "Our engine cross-references millions of data points across global societies and DSPs.",
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Recover Revenue",
                description: "Get actionable findings with one-click dispute filing and recovery tracking.",
              },
            ].map((item, i) => (
              <div key={item.step} className={`relative group animate-slide-up opacity-0 delay-${(i + 1) * 100}`}>
                <div className="p-10 rounded-3xl bg-white border border-slate-100 hover:border-indigo-200 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-2 glass-card h-full flex flex-col">
                  <div className="flex items-center justify-between mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-100 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3">
                      <item.icon className="h-7 w-7 text-indigo-600" />
                    </div>
                    <div className="text-5xl font-black text-slate-100 group-hover:text-indigo-50 transition-colors">{item.step}</div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Showcase Section */}
      <section id="security" className="py-40 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        <div className="container mx-auto max-w-6xl px-6 relative z-10 flex flex-col lg:flex-row items-center gap-24">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-indigo-400 mb-8 uppercase tracking-widest">
              <Shield className="w-4 h-4" /> Enterprise Grade
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-8 text-white tracking-tighter leading-[0.95]">Secure your music<br />royalties in the vault.</h2>
            <p className="text-slate-400 text-xl leading-relaxed mb-12 font-medium">
              Your royalty data is your most valuable asset. We protect it with banking-grade encryption and immutable audit trails.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              {[
                { icon: Shield, text: "SOC 2 Type II Certified" },
                { icon: FileCheck, text: "Immutable Audit Logs" },
                { icon: Zap, text: "Real-Time Fraud Detection" },
                { icon: Bot, text: "AI-Driven Validation" }
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-4 text-slate-300 font-bold text-sm">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                    <feature.icon className="w-5 h-5 text-indigo-500" />
                  </div>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/register">
              <SparkButton size="lg" variant="ghost" className="bg-white text-slate-950 hover:bg-slate-100 rounded-2xl px-10 h-16 font-black uppercase tracking-widest text-xs transition-all shadow-xl">
                Learn About Security
              </SparkButton>
            </Link>
          </div>
          <div className="lg:w-1/2 relative w-full aspect-square max-w-md mx-auto">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-violet-500/10 blur-[100px] animate-pulse-glow" />
            <div className="relative h-full w-full rounded-[3rem] overflow-hidden border border-white/10 bg-slate-900/50 backdrop-blur-xl group flex items-center justify-center shadow-2xl">
              <div className="w-32 h-32 rounded-full bg-indigo-500/20 flex items-center justify-center animate-bounce shadow-[0_0_80px_rgba(79,70,229,0.3)] ring-1 ring-indigo-500/30">
                <Shield className="w-14 h-14 text-indigo-400" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

        <div className="container mx-auto max-w-4xl px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-tight">
            Ready to recover <br />your royalties?
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
            Join the next generation of music publishers and labels recovering millions in missing royalties with RoyaltyRadar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/register">
              <SparkButton size="lg" variant="secondary" className="h-16 px-12 text-sm font-black uppercase tracking-widest rounded-2xl shadow-2xl">
                Start Free Trial
                <ArrowRight className="ml-3 w-5 h-5" aria-hidden="true" />
              </SparkButton>
            </Link>
            <Link href="/login">
              <SparkButton size="lg" variant="tertiary" className="h-16 px-12 text-sm font-black uppercase tracking-widest rounded-2xl">
                Sign In
              </SparkButton>
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
      <footer className="bg-slate-50 text-slate-500 pt-24 pb-12 relative overflow-hidden border-t border-slate-100">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-4 gap-16 mb-20">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl shadow-indigo-500/15">
                  RR
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tighter">RoyaltyRadar</span>
              </div>
              <p className="text-sm font-medium leading-relaxed mb-8">
                AI-powered music catalog audit & revenue recovery platform for modern rights holders.
              </p>
              <div className="flex items-center gap-4">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center transition-all shadow-sm hover:-translate-y-1">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Product</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-sm font-medium hover:text-indigo-600 transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-sm font-medium hover:text-indigo-600 transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="text-sm font-medium hover:text-indigo-600 transition-colors">Process</Link></li>
                <li><Link href="/register" className="text-sm font-medium hover:text-indigo-600 transition-colors">Free Trial</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Company</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">About Us</Link></li>
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Legal</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-sm font-medium hover:text-indigo-600 transition-colors">Security Hub</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              © {new Date().getFullYear()} RR SYSTEMS. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100/50 border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Shield className="w-3 h-3 text-indigo-500" />
              SOC 2 TYPE II COMPLIANT
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
