"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#free-audit", label: "Free Scan" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
  { href: "/blog", label: "Blog" },
];

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
      <Drawer.Trigger asChild>
        <button
          className="lg:hidden p-1.5 rounded-lg text-[#d1d1d6] hover:text-white transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[80vw] flex-col bg-[#1d1d1f] shadow-2xl outline-none"
          aria-label="Navigation menu"
        >
          <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#424245]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-[8px] font-black text-black">
                RR
              </div>
              <span className="text-sm font-semibold text-[#f5f5f7] tracking-tight">
                RoyaltyRadar
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-[#86868b] hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-0.5" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#d1d1d6] hover:text-[#f5f5f7] hover:bg-[#2d2d2f] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="px-4 pb-5 pt-2 flex flex-col gap-2.5 border-t border-[#424245]">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center h-10 rounded-full border border-[#424245] text-sm text-[#d1d1d6] hover:border-[#86868b] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 h-10 rounded-full bg-green-500 text-black text-sm font-medium hover:bg-green-400 transition-colors"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
