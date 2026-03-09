"use client";

import { useState } from "react";
import { TrendingUp, Info, ChevronDown, ChevronUp, DollarSign, Music2, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────
// Deal structure definitions used in comparison
// ─────────────────────────────────────────────────
const DEAL_STRUCTURES = [
    {
        key: "admin",
        label: "Admin Deal",
        description: "Publisher administers rights and collects royalties for a commission fee. Writer retains 100% ownership.",
        publisherCommission: 0.15,
        ownershipRetained: 1.0,
        valuationRange: [8, 12],
        color: "border-t-emerald-500",
        badge: "Low Risk",
        badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        pros: ["Writer keeps 100% ownership", "Low commission (10–20%)", "Easy to exit"],
        cons: ["No advance typically", "Less promotional support"],
    },
    {
        key: "copub",
        label: "Co-Publishing Deal",
        description: "Publisher acquires 50% of the copyright (publisher's share). Writer retains 50% ownership.",
        publisherCommission: 0.0,
        ownershipRetained: 0.5,
        valuationRange: [10, 15],
        color: "border-t-indigo-500",
        badge: "Standard",
        badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
        pros: ["Larger advance possible", "Full label/promotional support", "Higher collection reach"],
        cons: ["Writer gives up 50% ownership", "Longer term commitment"],
    },
    {
        key: "fullpub",
        label: "Full Publishing Deal",
        description: "Publisher acquires 100% of the copyright. Writer receives only the writer's share (50%) of royalties.",
        publisherCommission: 0.0,
        ownershipRetained: 0.0,
        valuationRange: [12, 18],
        color: "border-t-violet-500",
        badge: "High Return",
        badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
        pros: ["Highest advance potential", "Full publisher resources", "Global collection"],
        cons: ["Writer gives up all ownership", "No reversionary rights typically"],
    },
];

interface Props {
    workCount: number;
    recordingCount: number;
    annualRevenue: number;
    topWorks: { title: string; annualRevenue: number }[];
}

function fmt(n: number, decimals = 0): string {
    return n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function fmtUsd(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${fmt(n, 2)}`;
}

export function CatalogValuationClient({ workCount, recordingCount, annualRevenue, topWorks }: Props) {
    const [multiplier, setMultiplier] = useState(10);
    const [showMethodology, setShowMethodology] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState("copub");

    const catalogValue = annualRevenue * multiplier;
    const perWorkValue = workCount > 0 ? catalogValue / workCount : 0;

    const deal = DEAL_STRUCTURES.find((d) => d.key === selectedDeal) ?? DEAL_STRUCTURES[1];
    const writerNetValue = catalogValue * deal.ownershipRetained;
    const adminNetValue = annualRevenue * (1 - deal.publisherCommission);

    const minVal = annualRevenue * deal.valuationRange[0];
    const maxVal = annualRevenue * deal.valuationRange[1];

    // Net amount retained by the writer under the selected deal:
    // - Admin deal: writer retains ownership so net value = annual income after commission × multiplier
    // - Co-pub / Full pub: writer nets proportional share of catalog value
    const netToWriter = deal.key === "admin"
        ? adminNetValue * multiplier
        : writerNetValue;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <TrendingUp className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        Catalog Valuation
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Estimate the market value of your music catalog and compare deal structures.
                    </p>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700 hidden sm:flex">
                    Estimate
                </Badge>
            </div>

            {/* KPI Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Catalog Value</span>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {fmtUsd(catalogValue)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">At {multiplier}× annual revenue</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Annual Revenue</span>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {fmtUsd(annualRevenue)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">From imported statements</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Works in Catalog</span>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/15 to-amber-500/10 flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-orange-500" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {fmt(workCount)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{fmt(recordingCount)} recordings</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Value per Work</span>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/15 to-pink-500/10 flex items-center justify-center">
                                <Music2 className="h-4 w-4 text-rose-500" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {fmtUsd(perWorkValue)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Average per composition</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Left: Multiplier + Deal Comparison ── */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Multiplier Slider */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                            <CardTitle className="text-base font-semibold">Valuation Multiplier</CardTitle>
                            <CardDescription>
                                Catalog acquisitions typically trade at 8–20× annual publishing income. Adjust the multiplier to model different market scenarios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="flex items-center gap-4 mb-3">
                                <span className="text-4xl font-black text-slate-900 dark:text-white w-16">{multiplier}×</span>
                                <input
                                    type="range"
                                    min={4}
                                    max={25}
                                    step={0.5}
                                    value={multiplier}
                                    onChange={(e) => setMultiplier(Number(e.target.value))}
                                    className="flex-1 accent-indigo-600"
                                    aria-label="Valuation multiplier"
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>4× (Distressed)</span>
                                <span>12× (Market avg)</span>
                                <span>25× (Premium)</span>
                            </div>

                            {/* Value Range Bar */}
                            <div className="mt-6">
                                <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <span>Market Range for {deal.label}</span>
                                    <span className="text-slate-400 font-normal">{deal.valuationRange[0]}×–{deal.valuationRange[1]}× typical</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, (multiplier / 25) * 100)}%` }}
                                        role="progressbar"
                                        aria-valuenow={multiplier}
                                        aria-valuemin={4}
                                        aria-valuemax={25}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                    <span>Range: {fmtUsd(minVal)} – {fmtUsd(maxVal)}</span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Your est: {fmtUsd(catalogValue)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Deal Structure Comparison */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                            <CardTitle className="text-base font-semibold">Deal Structure Comparison</CardTitle>
                            <CardDescription>Compare how different deal types affect your net ownership and potential advance</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {DEAL_STRUCTURES.map((d) => (
                                    <button
                                        key={d.key}
                                        onClick={() => setSelectedDeal(d.key)}
                                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${selectedDeal === d.key
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                            }`}
                                        aria-pressed={selectedDeal === d.key}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{d.label}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.badgeColor}`}>
                                                {d.badge}
                                            </span>
                                        </div>
                                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-1">
                                            {fmtUsd(catalogValue * d.ownershipRetained)}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {d.ownershipRetained > 0 ? `${(d.ownershipRetained * 100).toFixed(0)}% ownership retained` : "Rights transferred"}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Advance range: {fmtUsd(annualRevenue * d.valuationRange[0])} – {fmtUsd(annualRevenue * d.valuationRange[1])}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Selected Deal Details */}
                            <div className={`mt-4 rounded-xl border-t-4 ${deal.color} border border-slate-200 dark:border-slate-700 p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{deal.label}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deal.badgeColor}`}>{deal.badge}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{deal.description}</p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">Pros</div>
                                        <ul className="space-y-1">
                                            {deal.pros.map((p) => (
                                                <li key={p} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                                    <span className="text-emerald-500 mt-0.5" aria-hidden="true">✓</span> {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1.5">Cons</div>
                                        <ul className="space-y-1">
                                            {deal.cons.map((c) => (
                                                <li key={c} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                                    <span className="text-rose-500 mt-0.5" aria-hidden="true">✗</span> {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Works by Value */}
                    {topWorks.length > 0 && (
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                                <CardTitle className="text-base font-semibold">Most Valuable Works</CardTitle>
                                <CardDescription>Compositions ranked by estimated annual royalty income</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-left">#</th>
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-left">Title</th>
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Annual Rev.</th>
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Est. Value ({multiplier}×)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {topWorks.map((w, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="py-2.5 text-slate-400 text-xs">{i + 1}</td>
                                                <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{w.title}</td>
                                                <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{fmtUsd(w.annualRevenue)}</td>
                                                <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {fmtUsd(w.annualRevenue * multiplier)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Right: Summary ── */}
                <div className="space-y-4">
                    {/* Net Value Summary */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-t-4 border-t-emerald-500">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Net to Writer
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {fmtUsd(netToWriter)}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Under a {deal.label}</p>

                            <div className="mt-4 space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Catalog Value</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtUsd(catalogValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Ownership Retained</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {(deal.ownershipRetained * 100).toFixed(0)}%
                                    </span>
                                </div>
                                {deal.publisherCommission > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Admin Commission</span>
                                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                                            {(deal.publisherCommission * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400">Advance Range</span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs">
                                        {fmtUsd(annualRevenue * deal.valuationRange[0])} – {fmtUsd(annualRevenue * deal.valuationRange[1])}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Catalog Snapshot
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Works</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(workCount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Recordings</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(recordingCount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Annual Revenue</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{fmtUsd(annualRevenue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Avg per Work/yr</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {fmtUsd(workCount > 0 ? annualRevenue / workCount : 0)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Methodology */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <button
                            onClick={() => setShowMethodology((v) => !v)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none"
                            aria-expanded={showMethodology}
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                <Info className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                Methodology
                            </span>
                            {showMethodology ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            )}
                        </button>
                        {showMethodology && (
                            <CardContent className="pt-0 pb-4 text-xs text-slate-500 dark:text-slate-400 space-y-2 border-t border-slate-100 dark:border-slate-800">
                                <p>Catalog value is calculated as Annual Revenue × Multiplier. Industry acquisition multipliers typically range from 8–20× NPS (Net Publisher Share) depending on genre, growth trajectory, and deal type.</p>
                                <p>Annual revenue is derived from the total royalty income in your imported statements. The valuation range per deal structure reflects market norms observed in recent publishing catalog transactions.</p>
                                <p>Top works are ranked by their share of total statement income attributed to each composition.</p>
                                <p className="font-semibold text-slate-600 dark:text-slate-300">These are estimates only — not financial advice. Engage a qualified music business attorney before entering any publishing deal.</p>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
