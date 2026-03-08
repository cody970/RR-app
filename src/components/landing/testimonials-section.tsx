import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "We ran RoyaltyRadar on our back catalog and found $140K in ISWC mapping errors we'd never have caught manually. The audit paid for itself in the first week.",
    name: "Sarah Chen",
    role: "Senior Rights Manager",
    company: "Meridian Music Publishing",
    initials: "SC",
    gradient: "from-indigo-500 to-violet-600",
    stars: 5,
  },
  {
    quote:
      "As a producer, I always assumed my ISRCs were fine. Turns out three of my biggest placements had duplicate codes — two years of SoundExchange income was sitting unmatched. Found it in minutes.",
    name: "James Okafor",
    role: "Independent Producer & Songwriter",
    company: "JO Music Group",
    initials: "JO",
    gradient: "from-amber-500 to-orange-500",
    stars: 5,
  },
  {
    quote:
      "Content ID was claiming revenue on uploads we fully owned. RoyaltyRadar's monitoring caught every false claim and helped us dispute them systematically. We recovered 38% more YouTube revenue.",
    name: "Maria Santos",
    role: "Head of Digital Catalog",
    company: "Ritmo Latino Records",
    initials: "MS",
    gradient: "from-emerald-500 to-teal-600",
    stars: 5,
  },
  {
    quote:
      "The split sheet tracking alone is worth the subscription. Before, we had undocumented ownership disputes on almost every collaboration. Now every new session produces a signed record automatically.",
    name: "David Park",
    role: "Music Rights Attorney",
    company: "Park & Associates LLP",
    initials: "DP",
    gradient: "from-rose-500 to-pink-600",
    stars: 5,
  },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="py-28 md:py-36 bg-slate-50 border-t border-slate-200 relative overflow-hidden"
    >
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-[10px] font-black text-amber-600 mb-6 uppercase tracking-[0.2em]">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
            From Our Customers
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4">
            Real recoveries. Real money.
          </h2>
          <p className="text-slate-500 text-xl font-medium max-w-xl mx-auto leading-relaxed">
            Publishers, producers, and rights managers share what they found when they
            finally looked.
          </p>
        </div>

        {/* Testimonial grid */}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Stars */}
              <StarRow count={t.stars} />

              {/* Quote */}
              <blockquote className="mt-4 flex-1">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>

              {/* Author */}
              <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-slate-100">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-[11px] font-black text-white shadow-md flex-shrink-0`}
                >
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 leading-tight truncate">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {t.role}
                  </p>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider truncate">
                    {t.company}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Aggregate social proof */}
        <div className="mt-14 flex flex-wrap justify-center items-center gap-6 md:gap-10 text-center">
          {[
            { value: "4.9 / 5", label: "Average rating" },
            { value: "2,300+", label: "Active publishers" },
            { value: "$47M+", label: "Royalties recovered" },
            { value: "98%", label: "Would recommend" },
          ].map(({ value, label }) => (
            <div key={label} className="px-6">
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
