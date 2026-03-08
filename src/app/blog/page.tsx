import Link from "next/link";
import { ArrowRight, Clock, Tag, BookOpen } from "lucide-react";
import { blogPosts, getFeaturedPosts } from "@/lib/blog/posts";

const categoryColors: Record<string, string> = {
  "Recovery Story": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Industry Insight": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Technical Guide": "bg-violet-50 text-violet-700 border-violet-200",
  "Case Study": "bg-amber-50 text-amber-700 border-amber-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const metadata = {
  title: "Blog – RoyaltyRadar",
  description:
    "Research, case studies, and recovery stories from the world of music royalties, metadata, and rights management.",
};

export default function BlogPage() {
  const featured = getFeaturedPosts();
  const rest = blogPosts.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
              RR
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">
              Royalty<span className="text-gradient-gold">Radar</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Back to Home
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 md:py-28 px-4 sm:px-6 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        <div className="container mx-auto max-w-4xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-indigo-400 mb-6 uppercase tracking-[0.2em]">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            Research &amp; Recovery
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-[0.95]">
            The{" "}
            <span className="text-gradient-gold">royalty</span>{" "}
            knowledge base.
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Real recovery stories, industry research, and technical guides for rights
            holders who want to stop leaving money on the table.
          </p>
        </div>
      </section>

      {/* Featured Posts */}
      {featured.length > 0 && (
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-slate-50 border-b border-slate-200">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
              Featured
            </h2>
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group relative flex flex-col bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Category badge */}
                  <span
                    className={`inline-flex self-start items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border mb-5 ${categoryColors[post.category] ?? ""}`}
                  >
                    {post.category}
                  </span>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug mb-3 group-hover:text-indigo-700 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3 flex-1 mb-6">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-black text-white">
                        {post.author.initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-[11px]">{post.author.name}</p>
                        <p className="text-[10px] text-slate-400">{post.author.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {post.readTime} min read
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
            All Articles
          </h2>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${categoryColors[post.category] ?? ""}`}
                  >
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {post.readTime} min
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug mb-2 group-hover:text-indigo-700 transition-colors line-clamp-3">
                  {post.title}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2 flex-1 mb-4">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold"
                    >
                      <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[8px] font-black text-white">
                      {post.author.initials}
                    </div>
                    <span className="font-semibold text-slate-600 text-[11px]">{post.author.name}</span>
                  </div>
                  <time dateTime={post.publishedAt} className="text-[11px]">
                    {formatDate(post.publishedAt)}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[250px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">
            Free plan forever · No credit card
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 leading-tight">
            Don&apos;t just read about recovery.
            <br />
            <span className="text-gradient-gold">Do it — for free.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg font-medium mb-8 leading-relaxed">
            RoyaltyRadar automates every audit described in these articles. ISRC
            validation, ISWC cross-matching, Content ID monitoring, society dispute
            filing — all in one platform. Start free in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 h-14 px-8 rounded-2xl bg-white text-slate-900 text-sm font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-2xl"
            >
              Start for Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center h-14 px-6 rounded-2xl border border-white/10 text-white/70 text-sm font-bold hover:border-white/30 hover:text-white transition-all"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-slate-200 bg-white">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-black text-white">
              RR
            </div>
            <span className="text-sm font-black text-slate-900 tracking-tight">RoyaltyRadar</span>
          </Link>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} RR Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
