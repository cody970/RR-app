"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { StarButton } from "@/components/ui/star-button";

export function HeroStarCta() {
  const { resolvedTheme } = useTheme();
  const lightColor = resolvedTheme === "dark" ? "#FAFAFA" : "#FF2056";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-slide-up delay-300">
      <Link href="/register">
        <StarButton
          lightColor={lightColor}
          className="w-full sm:w-auto h-16 px-10 text-sm font-black uppercase tracking-widest rounded-2xl shadow-2xl"
        >
          Connect Catalog Free
          <ArrowRight className="ml-3 w-5 h-5" aria-hidden="true" />
        </StarButton>
      </Link>
      <Link href="#demo">
        <StarButton
          lightColor={lightColor}
          className="w-full sm:w-auto h-16 px-10 text-sm font-black uppercase tracking-widest rounded-2xl"
        >
          Interactive Demo
        </StarButton>
      </Link>
    </div>
  );
}
