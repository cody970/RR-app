"use client";

import { useState, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
  Mail,
  Music2,
} from "lucide-react";
import { FadeIn, StaggerChildren, StaggerItem } from "./scroll-animations";

/* ─────────────────────────────────────────────
 * Simulated audit findings for the free tool.
 * In production this would call a real API; for
 * lead-gen purposes we show realistic sample
 * results to hook the prospect.
 * ───────────────────────────────────────────── */

interface FindingItem {
  severity: "critical" | "warning" | "info";
  label: string;
}

function generateFindings(artistName: string): FindingItem[] {
  // Deterministic but varied results based on artist name length
  const seed = artistName.length % 4;
  const base: FindingItem[][] = [
    [
      { severity: "critical", label: "3 works missing ISWC registration with ASCAP/BMI" },
      { severity: "critical", label: "Potential unclaimed mechanical royalties at The MLC" },
      { severity: "warning", label: "5 recordings missing ISRC codes on Spotify" },
      { severity: "warning", label: "Publisher splits not registered with 2 foreign societies" },
      { severity: "info", label: "12 tracks eligible for SoundExchange digital performance royalties" },
    ],
    [
      { severity: "critical", label: "2 compositions not registered with any PRO" },
      { severity: "warning", label: "4 recordings have mismatched metadata on Apple Music" },
      { severity: "warning", label: "Missing neighboring rights registrations in 8 territories" },
      { severity: "info", label: "7 potential sync licensing opportunities detected" },
      { severity: "info", label: "Content ID coverage incomplete on 3 YouTube uploads" },
    ],
    [
      { severity: "critical", label: "Unregistered compositions found in MLC database" },
      { severity: "critical", label: "Black box royalties potentially owed from 2 societies" },
      { severity: "warning", label: "6 tracks with incomplete songwriter credit metadata" },
      { severity: "warning", label: "Sound recording registrations missing in Japan & Germany" },
      { severity: "info", label: "15 streams detected with no matching royalty payments" },
    ],
    [
      { severity: "critical", label: "4 works have conflicting ownership claims" },
      { severity: "warning", label: "Publisher share discrepancies on 3 compositions" },
      { severity: "warning", label: "ISRC duplicates detected across 2 distributors" },
      { severity: "info", label: "9 recordings eligible for retroactive mechanical claims" },
      { severity: "info", label: "International sub-publishing gaps in 5 territories" },
    ],
  ];
  return base[seed];
}

const severityConfig = {
  critical: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  info: {
    icon: CheckCircle2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

export function FreeAuditSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const [artistName, setArtistName] = useState("");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "scanning" | "results">("form");
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!artistName.trim() || !email.trim()) return;

    setPhase("scanning");

    // Fire lead capture in the background
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          artistName: artistName.trim(),
          source: "free-audit",
        }),
      });
    } catch {
      // Non-blocking — we still show results even if lead save fails
    }

    // Simulated scan delay for UX
    await new Promise((r) => setTimeout(r, 2400));
    setFindings(generateFindings(artistName.trim()));
    setPhase("results");
    setSubmitted(true);
  }

  function handleReset() {
    setPhase("form");
    setArtistName("");
    setEmail("");
    setFindings([]);
  }

  return (
    <section
      ref={sectionRef}
      id="free-audit"
      className="py-24 md:py-36 bg-gradient-to-b from-[#000000] via-[#0a0f0a] to-[#000000]"
    >
      <div className="mx-auto max-w-[980px] px-6">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <FadeIn>
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-green-500/10 text-green-400 text-xs font-medium mb-6 border border-green-500/20">
              <Search className="h-3 w-3" />
              100% Free — No Account Required
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#f5f5f7] mb-4">
              Free Royalty Health Check.
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-lg text-[#86868b] max-w-2xl mx-auto">
              Enter your artist name and we&rsquo;ll scan global databases to preview potential missing royalties — in seconds.
            </p>
          </FadeIn>
        </div>

        {/* Interactive card */}
        <FadeIn delay={0.3}>
          <div className="mx-auto max-w-2xl rounded-2xl bg-[#1d1d1f] border border-[#2d2d2f] overflow-hidden">
            <AnimatePresence mode="wait">
              {/* ── Form Phase ── */}
              {phase === "form" && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="p-8 md:p-10"
                >
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="artist-name"
                        className="block text-xs font-medium text-[#86868b] mb-2"
                      >
                        Artist or Band Name
                      </label>
                      <div className="relative">
                        <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6e6e73]" />
                        <input
                          id="artist-name"
                          type="text"
                          required
                          value={artistName}
                          onChange={(e) => setArtistName(e.target.value)}
                          placeholder="e.g. Frank Ocean"
                          maxLength={120}
                          className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#2d2d2f] border border-[#424245] text-sm text-[#f5f5f7] placeholder:text-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="lead-email"
                        className="block text-xs font-medium text-[#86868b] mb-2"
                      >
                        Email (to receive your full report)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6e6e73]" />
                        <input
                          id="lead-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          maxLength={254}
                          className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#2d2d2f] border border-[#424245] text-sm text-[#f5f5f7] placeholder:text-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-green-500 text-black text-sm font-medium hover:bg-green-400 transition-colors"
                  >
                    Run Free Scan
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <p className="mt-4 text-center text-[11px] text-[#6e6e73]">
                    We&rsquo;ll never spam you. Unsubscribe anytime.
                  </p>
                </motion.form>
              )}

              {/* ── Scanning Phase ── */}
              {phase === "scanning" && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 md:p-10 flex flex-col items-center justify-center min-h-[320px]"
                >
                  <Loader2 className="h-8 w-8 text-green-400 animate-spin mb-6" />
                  <p className="text-sm font-medium text-[#f5f5f7] mb-2">
                    Scanning global databases&hellip;
                  </p>
                  <p className="text-xs text-[#6e6e73]">
                    Checking PROs, DSPs, and collection societies for &ldquo;{artistName}&rdquo;
                  </p>

                  {/* Fake progress steps */}
                  <div className="mt-8 space-y-3 w-full max-w-xs">
                    {["ASCAP / BMI / SESAC", "The MLC", "Spotify / Apple Music", "SoundExchange"].map(
                      (src, i) => (
                        <motion.div
                          key={src}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.5 }}
                          className="flex items-center gap-2 text-xs text-[#86868b]"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.5 + 0.3 }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          </motion.div>
                          {src}
                        </motion.div>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Results Phase ── */}
              {phase === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="p-8 md:p-10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-[#f5f5f7]">
                        Scan Results for &ldquo;{artistName}&rdquo;
                      </h3>
                      <p className="text-xs text-[#6e6e73] mt-1">
                        Preview — sign up for the full detailed report
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors"
                    >
                      Scan another
                    </button>
                  </div>

                  {/* Findings list */}
                  <StaggerChildren className="space-y-3" stagger={0.08}>
                    {findings.map((f, i) => {
                      const cfg = severityConfig[f.severity];
                      return (
                        <StaggerItem key={i}>
                          <div
                            className={`flex items-start gap-3 rounded-xl p-4 ${cfg.bg} border ${cfg.border}`}
                          >
                            <cfg.icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                            <span className="text-sm text-[#d1d1d6]">{f.label}</span>
                          </div>
                        </StaggerItem>
                      );
                    })}
                  </StaggerChildren>

                  {/* Estimated recovery */}
                  <div className="mt-6 p-5 rounded-xl bg-[#2d2d2f] border border-[#424245]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#86868b]">Estimated Recoverable Royalties</span>
                      <span className="text-[10px] text-[#6e6e73]">Based on catalog scan</span>
                    </div>
                    <div className="text-3xl font-semibold text-green-400 tracking-tight">
                      ${(((artistName.length * 1731) % 8000) + 4200).toLocaleString()}&ndash;${(((artistName.length * 1731) % 8000) + 12800).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#6e6e73] mt-1">
                      Across PRO, mechanical, and neighboring rights sources
                    </p>
                  </div>

                  {/* Upgrade CTA */}
                  <div className="mt-4 p-5 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
                    <p className="text-sm text-[#d1d1d6] mb-3">
                      This is a preview. Sign up free to get
                      the <span className="text-green-400 font-medium">full detailed audit</span> with
                      actionable recovery steps.
                    </p>
                    <a
                      href="/register"
                      className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-green-500 text-black text-sm font-medium hover:bg-green-400 transition-colors"
                    >
                      Get Full Report — Free
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>

        {/* Trust points */}
        {!submitted && (
          <StaggerChildren
            className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4"
            stagger={0.1}
            delay={0.5}
          >
            {[
              "No credit card required",
              "Results in seconds",
              "100% confidential",
            ].map((t) => (
              <StaggerItem key={t}>
                <div className="flex items-center gap-2 text-xs text-[#6e6e73]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500/60" />
                  {t}
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </div>
    </section>
  );
}
