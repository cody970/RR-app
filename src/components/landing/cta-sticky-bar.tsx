"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X, Sparkles } from "lucide-react";

/**
 * CtaStickyBar — fixed bottom bar that slides up after 400 px of scroll.
 * Dismissible with the X button (stores preference in sessionStorage so it
 * doesn't re-appear on every scroll within the same session).
 */
export function CtaStickyBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("cta-bar-dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const onScroll = () => {
      if (window.scrollY > 400) setVisible(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("cta-bar-dismissed", "1");
  };

  if (dismissed || !visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Start for free"
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
    >
      {/* Backdrop blur line */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/40" />

      <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: copy */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 items-center justify-center flex-shrink-0 shadow-md shadow-green-500/20">
            <Sparkles className="h-4 w-4 text-black" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-tight">
              Join 2,300+ publishers recovering missing royalties.
            </p>
            <p className="text-xs text-neutral-400 font-medium">
              Free plan available — no credit card required.
            </p>
          </div>
        </div>

        {/* Right: CTA + dismiss */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-green-500 text-black text-xs font-black uppercase tracking-wider hover:bg-green-600 active:scale-95 transition-all shadow-lg shadow-green-500/25"
          >
            Start for Free
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
