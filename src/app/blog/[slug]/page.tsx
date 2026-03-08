import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Tag, ArrowRight } from "lucide-react";
import { getPostBySlug, blogPosts, getAllSlugs } from "@/lib/blog/posts";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found – RoyaltyRadar" };
  return {
    title: `${post.title} – RoyaltyRadar Blog`,
    description: post.excerpt,
  };
}

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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  // Related posts: same category, different slug, up to 2
  const related = blogPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
              RR
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 hidden sm:block">
              Royalty<span className="text-gradient-gold">Radar</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/blog"
              className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">All Articles</span>
              <span className="sm:hidden">Blog</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Post Header */}
      <article>
        <header className="relative py-14 md:py-20 px-4 sm:px-6 bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

          <div className="container mx-auto max-w-3xl relative z-10">
            {/* Category + meta */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${categoryColors[post.category] ?? ""}`}
              >
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {post.readTime} min read
              </span>
              <time dateTime={post.publishedAt} className="text-slate-500 text-xs font-medium">
                {formatDate(post.publishedAt)}
              </time>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6">
              {post.title}
            </h1>

            <p className="text-slate-400 text-base sm:text-lg font-medium leading-relaxed mb-8">
              {post.excerpt}
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 pt-6 border-t border-white/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/20">
                {post.author.initials}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{post.author.name}</p>
                <p className="text-slate-400 text-xs">{post.author.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Post Content */}
        <div className="py-12 md:py-16 px-4 sm:px-6">
          <div className="container mx-auto max-w-3xl">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-10">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold"
                >
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Prose content */}
            <div
              className="prose prose-slate prose-lg max-w-none
                prose-headings:font-black prose-headings:tracking-tight
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-slate-900
                prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-slate-800
                prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4
                prose-ul:text-slate-600 prose-ul:my-4
                prose-ol:text-slate-600 prose-ol:my-4
                prose-li:mb-2
                prose-strong:text-slate-900 prose-strong:font-bold
                prose-em:text-slate-700
                [&>p]:text-base sm:[&>p]:text-[17px]"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Divider */}
            <div className="mt-14 pt-10 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Written by</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white">
                      {post.author.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{post.author.name}</p>
                      <p className="text-xs text-slate-500">{post.author.role}</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/blog"
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to all articles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="py-14 md:py-16 px-4 sm:px-6 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
              Related Articles
            </h2>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <span
                    className={`inline-flex self-start items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border mb-3 ${categoryColors[p.category] ?? ""}`}
                  >
                    {p.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug mb-2 group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2 flex-1 mb-3">
                    {p.excerpt}
                  </p>
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
                    Read article <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-14 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />
        <div className="container mx-auto max-w-2xl text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Ready to audit your catalog?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-medium mb-6 leading-relaxed">
            RoyaltyRadar automates everything you just read about — start a free trial and see
            what you&apos;re missing.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-2xl bg-white text-slate-900 text-sm font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-xl"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
