import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface InlineBlogCtaProps {
  /** Contextual hook relevant to the surrounding article content */
  hook?: string;
}

/**
 * Small inline CTA widget injected mid-way through blog post content.
 * Keeps the tone helpful rather than salesy.
 */
export function InlineBlogCta({
  hook = "Stop guessing — see exactly what you're missing.",
}: InlineBlogCtaProps) {
  return (
    <aside
      aria-label="Try RoyaltyRadar free"
      className="not-prose my-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/50 p-6 shadow-sm"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
        <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-900 leading-snug mb-1">{hook}</p>
        <p className="text-xs text-slate-500 font-medium">
          RoyaltyRadar audits your full catalog automatically. Free plan, no credit card.
        </p>
      </div>

      <Link
        href="/register"
        className="flex-shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
      >
        Audit free
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </aside>
  );
}
