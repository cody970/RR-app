"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import Link from "next/link";
import { Menu, X, ArrowRight, Shield, Zap } from "lucide-react";
import { SparkButton } from "@/components/spark/spark-button";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "Process" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
];

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
      <Drawer.Trigger asChild>
        <button
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[80vw] flex-col bg-white shadow-2xl outline-none"
          aria-label="Navigation menu"
        >
          <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-500/20">
                RR
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Royalty<span className="text-gradient-gold">Radar</span>
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Trust badges */}
          <div className="px-6 py-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              SOC 2 Type II Certified
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              99.9% Uptime SLA
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="px-4 pb-6 pt-2 flex flex-col gap-3">
            <Link href="/login" onClick={() => setOpen(false)}>
              <SparkButton variant="tertiary" size="lg" className="w-full h-11 font-bold">
                Sign In
              </SparkButton>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <SparkButton variant="secondary" size="lg" className="w-full h-11 font-bold">
                Start Free Trial
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
              </SparkButton>
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
