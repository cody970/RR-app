"use client";

import { useState, useCallback } from "react";
import { Calculator, Music2, Globe, TrendingUp, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ──────────────────────────────────────────────
// Royalty rate tables (per-stream estimates, USD)
// Sources: industry averages, Music Oomph, Soundcharts
// ──────────────────────────────────────────────
const PLATFORM_RATES: Record<
    string,
    { mechanical: number; performance: number; label: string; color: string }
> = {
    spotify: {
        mechanical: 0.00083,
        performance: 0.00245,
        label: "Spotify",
        color: "bg-green-500",
    },
    apple_music: {
        mechanical: 0.00099,
        performance: 0.00672,
        label: "Apple Music",
        color: "bg-pink-500",
    },
    youtube: {
        mechanical: 0.00012,
        performance: 0.00051,
        label: "YouTube Music",
        color: "bg-red-500",
    },
    amazon: {
        mechanical: 0.00092,
        performance: 0.00305,
        label: "Amazon Music",
        color: "bg-blue-500",
    },
    tidal: {
        mechanical: 0.00137,
        performance: 0.00929,
        label: "Tidal",
        color: "bg-cyan-500",
    },
    deezer: {
        mechanical: 0.00064,
        performance: 0.00192,
        label: "Deezer",
        color: "bg-violet-500",
    },
    pandora: {
        mechanical: 0.00058,
        performance: 0.00116,
        label: "Pandora",
        color: "bg-orange-500",
    },
};

// Territory multipliers relative to US base rate
const TERRITORY_MULTIPLIERS: Record<string, { label: string; multiplier: number }> = {
    us: { label: "United States", multiplier: 1.0 },
    uk: { label: "United Kingdom", multiplier: 0.92 },
    eu: { label: "European Union", multiplier: 0.85 },
    ca: { label: "Canada", multiplier: 0.78 },
    au: { label: "Australia", multiplier: 0.74 },
    jp: { label: "Japan", multiplier: 0.68 },
    latam: { label: "Latin America", multiplier: 0.35 },
    row: { label: "Rest of World", multiplier: 0.22 },
};

const DEFAULT_STREAMS: Record<string, string> = {
    spotify: "",
    apple_music: "",
    youtube: "",
    amazon: "",
    tidal: "",
    deezer: "",
    pandora: "",
};

type RoyaltyType = "all" | "mechanical" | "performance";

function fmt(n: number): string {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtStreams(n: string): string {
    const num = parseInt(n.replace(/,/g, ""), 10);
    if (isNaN(num)) return n;
    return num.toLocaleString("en-US");
}

export default function PubCalculatorPage() {
    const [streams, setStreams] = useState<Record<string, string>>(DEFAULT_STREAMS);
    const [royaltyType, setRoyaltyType] = useState<RoyaltyType>("all");
    const [territory, setTerritory] = useState("us");
    const [publisherShare, setPublisherShare] = useState(50);
    const [showMethodology, setShowMethodology] = useState(false);

    const handleStreamChange = useCallback((platform: string, value: string) => {
        // Strip non-numeric characters
        const stripped = value.replace(/[^0-9]/g, "");
        setStreams((prev) => ({ ...prev, [platform]: stripped }));
    }, []);

    // ── Calculations ──
    const multiplier = TERRITORY_MULTIPLIERS[territory]?.multiplier ?? 1.0;

    const platformResults = Object.entries(PLATFORM_RATES).map(([key, rate]) => {
        const count = parseInt(streams[key] || "0", 10);
        const mechEarnings = count * rate.mechanical * multiplier;
        const perfEarnings = count * rate.performance * multiplier;
        const total =
            royaltyType === "mechanical"
                ? mechEarnings
                : royaltyType === "performance"
                    ? perfEarnings
                    : mechEarnings + perfEarnings;

        const pubShare = total * (publisherShare / 100);
        const writerShare = total * (1 - publisherShare / 100);

        return {
            key,
            label: rate.label,
            color: rate.color,
            count,
            mechEarnings,
            perfEarnings,
            total,
            pubShare,
            writerShare,
        };
    });

    const totalEarnings = platformResults.reduce((s, r) => s + r.total, 0);
    const totalMech = platformResults.reduce((s, r) => s + r.mechEarnings, 0);
    const totalPerf = platformResults.reduce((s, r) => s + r.perfEarnings, 0);
    const totalPubShare = platformResults.reduce((s, r) => s + r.pubShare, 0);
    const totalWriterShare = platformResults.reduce((s, r) => s + r.writerShare, 0);
    const totalStreams = platformResults.reduce((s, r) => s + r.count, 0);

    const topPlatform =
        platformResults.reduce<(typeof platformResults)[0] | null>((best, r) =>
            r.total > (best?.total ?? 0) ? r : best, null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Calculator className="h-7 w-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        Publishing Calculator
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Estimate streaming royalty earnings by platform, territory, and royalty type.
                    </p>
                </div>
                <Badge variant="outline" className="text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-700 hidden sm:flex">
                    Beta
                </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Left: Inputs ── */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Controls */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                            <CardTitle className="text-base font-semibold">Settings</CardTitle>
                            <CardDescription>Choose territory, royalty type, and publisher split</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid gap-4 sm:grid-cols-3">
                                {/* Territory */}
                                <div>
                                    <label
                                        htmlFor="territory-select"
                                        className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5"
                                    >
                                        Territory
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                                        <select
                                            id="territory-select"
                                            value={territory}
                                            onChange={(e) => setTerritory(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {Object.entries(TERRITORY_MULTIPLIERS).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Royalty Type */}
                                <div>
                                    <label
                                        htmlFor="royalty-type-select"
                                        className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5"
                                    >
                                        Royalty Type
                                    </label>
                                    <select
                                        id="royalty-type-select"
                                        value={royaltyType}
                                        onChange={(e) => setRoyaltyType(e.target.value as RoyaltyType)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="all">All (Mechanical + Performance)</option>
                                        <option value="mechanical">Mechanical Only</option>
                                        <option value="performance">Performance Only</option>
                                    </select>
                                </div>

                                {/* Publisher Share */}
                                <div>
                                    <label
                                        htmlFor="pub-share-input"
                                        className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5"
                                    >
                                        Publisher Share
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="pub-share-input"
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={publisherShare}
                                            onChange={(e) => setPublisherShare(Math.min(100, Math.max(0, Number(e.target.value))))}
                                            className="w-full px-3 py-2 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stream Inputs */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                            <CardTitle className="text-base font-semibold">Stream Counts</CardTitle>
                            <CardDescription>Enter stream count per platform for this song or catalog</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {Object.entries(PLATFORM_RATES).map(([key, rate]) => (
                                    <div key={key} className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rate.color}`} aria-hidden="true" />
                                        <label htmlFor={`stream-${key}`} className="text-sm font-medium text-slate-700 dark:text-slate-300 w-28 flex-shrink-0">
                                            {rate.label}
                                        </label>
                                        <div className="flex-1 relative">
                                            <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" aria-hidden="true" />
                                            <input
                                                id={`stream-${key}`}
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={streams[key] ? fmtStreams(streams[key]) : ""}
                                                onChange={(e) => handleStreamChange(key, e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Per-Platform Breakdown */}
                    {totalStreams > 0 && (
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                                <CardTitle className="text-base font-semibold">Platform Breakdown</CardTitle>
                                <CardDescription>Estimated earnings per platform</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Platform</th>
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Streams</th>
                                            {(royaltyType === "all" || royaltyType === "mechanical") && (
                                                <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Mechanical</th>
                                            )}
                                            {(royaltyType === "all" || royaltyType === "performance") && (
                                                <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Performance</th>
                                            )}
                                            <th className="pb-2 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {platformResults
                                            .filter((r) => r.count > 0)
                                            .sort((a, b) => b.total - a.total)
                                            .map((r) => (
                                                <tr key={r.key} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                                                        <span className="flex items-center gap-2">
                                                            <span className={`inline-block w-2 h-2 rounded-full ${r.color}`} aria-hidden="true" />
                                                            {r.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                                                        {r.count.toLocaleString()}
                                                    </td>
                                                    {(royaltyType === "all" || royaltyType === "mechanical") && (
                                                        <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                                                            ${fmt(r.mechEarnings)}
                                                        </td>
                                                    )}
                                                    {(royaltyType === "all" || royaltyType === "performance") && (
                                                        <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                                                            ${fmt(r.perfEarnings)}
                                                        </td>
                                                    )}
                                                    <td className="py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                                                        ${fmt(r.total)}
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
                    {/* Total Earnings */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-t-4 border-t-indigo-500">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Estimated Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                ${fmt(totalEarnings)}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                {totalStreams > 0 ? `${totalStreams.toLocaleString()} total streams` : "Enter stream counts to calculate"}
                            </p>

                            {totalStreams > 0 && (
                                <div className="mt-4 space-y-2">
                                    {royaltyType !== "performance" && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Mechanical</span>
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">${fmt(totalMech)}</span>
                                        </div>
                                    )}
                                    {royaltyType !== "mechanical" && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Performance</span>
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">${fmt(totalPerf)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Publisher ({publisherShare}%)</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">${fmt(totalPubShare)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Writer ({100 - publisherShare}%)</span>
                                            <span className="font-semibold text-violet-600 dark:text-violet-400">${fmt(totalWriterShare)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Platform */}
                    {topPlatform && topPlatform.count > 0 && (
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                                    Top Platform
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-block w-3 h-3 rounded-full ${topPlatform.color}`} aria-hidden="true" />
                                    <span className="font-bold text-slate-900 dark:text-white text-lg">{topPlatform.label}</span>
                                </div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">${fmt(topPlatform.total)}</div>
                                <p className="text-xs text-slate-400 mt-1">{topPlatform.count.toLocaleString()} streams</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Territory Info */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                                Territory
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-base font-bold text-slate-900 dark:text-white">
                                {TERRITORY_MULTIPLIERS[territory]?.label}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Rate multiplier:{" "}
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {((TERRITORY_MULTIPLIERS[territory]?.multiplier ?? 1) * 100).toFixed(0)}%
                                </span>{" "}
                                of US base rate
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
                                <p>Rates are industry-average estimates (USD) sourced from published PRO/MRO rate sheets and market reports. Actual rates vary by deal terms and collection societies.</p>
                                <p>Territory multipliers approximate the relative payout ratio compared to the US market based on IFPI and Midia Research data.</p>
                                <p>Publisher/Writer split follows the standard 50/50 default, adjustable above. Calculations do not account for recoupable advances or admin fees.</p>
                                <p className="font-semibold text-slate-600 dark:text-slate-300">These are estimates only — not financial advice.</p>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
