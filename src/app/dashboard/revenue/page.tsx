"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DollarSign, Building2, Upload, BarChart3, AlertTriangle, Loader2, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, X, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataState } from "@/components/ui/data-state";
import { useEventStream } from "@/hooks/useEventStream";

// ---------- Types ----------

interface RevenueSummary {
    totalEarned: number;
    totalStatements: number;
    latestPeriod: string;
    topSociety: { name: string; amount: number } | null;
    periodChange: number | null;
    bySociety: { name: string; amount: number }[];
    recentStatements: {
        id: string; source: string; period: string; totalAmount: number;
        lineCount: number; fileName: string | null; createdAt: string;
    }[];
}

interface TopWork {
    workId: string;
    title: string;
    totalAmount: number;
    totalUses: number;
}

interface DiscrepancySummary {
    total: number;
    totalImpact: number;
    open: number;
    high: number;
    byType: Record<string, number>;
    findings: {
        id: string; type: string; severity: string; status: string;
        confidence: number; estimatedImpact: number; description: string;
        createdAt: string;
    }[];
}

const SOCIETY_COLORS: Record<string, string> = {
    ASCAP: "#f59e0b",
    BMI: "#3b82f6",
    MLC: "#10b981",
    SOUNDEXCHANGE: "#8b5cf6",
};

function formatMoney(val: number | undefined | null): string {
    if (val === undefined || val === null) return "$0.00";
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
}

interface UploadResult {
    success: boolean;
    error?: string;
    source?: string;
    period?: string;
    totalAmount?: number;
    totalLines?: number;
    matched?: number;
    unmatched?: number;
}

export default function RevenuePage() {
    const [summary, setSummary] = useState<RevenueSummary | null>(null);
    const [topWorks, setTopWorks] = useState<TopWork[]>([]);
    const [discrepancies, setDiscrepancies] = useState<DiscrepancySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Real-time statement import notifications via SSE
    const { isConnected } = useEventStream({
        filter: ["statement.imported", "statement.matched"],
        onEvent: (event) => {
            if (event.type === "statement.imported") {
                // Auto-update data when a new statement is imported
                setUploadResult({
                    success: true,
                    source: event.data.source,
                    matched: event.data.matched,
                    unmatched: event.data.unmatched,
                });
                fetchData();
            }
        },
    });

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setFetchError(null);
        try {
            const signal = abortControllerRef.current.signal;
            const [sumRes, worksRes, discRes] = await Promise.all([
                fetch("/api/analytics/revenue?view=summary", { signal }),
                fetch("/api/analytics/revenue?view=by-work", { signal }),
                fetch("/api/analytics/discrepancies", { signal }),
            ]);

            if (sumRes.ok) setSummary(await sumRes.json());
            if (worksRes.ok) setTopWorks(await worksRes.json());
            if (discRes.ok) setDiscrepancies(await discRes.json());

            if (!sumRes.ok && !worksRes.ok && !discRes.ok) {
                setFetchError("Failed to load revenue data from all sources.");
            }
        } catch (e: any) {
            if (e.name === "AbortError") return;
            console.error("Failed to load revenue data:", e);
            setFetchError("A network error occurred while loading dashboard data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchData]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/statements/upload", { method: "POST", body: formData });
            const data: UploadResult = await res.json().catch(() => ({ success: false, error: "Invalid server response" }));
            setUploadResult(data);
            if (data.success) fetchData(); // Refresh
        } catch (err) {
            console.error("Upload error:", err);
            setUploadResult({ success: false, error: "A network error occurred during upload." });
        } finally {
            setUploading(false);
            // Clear input
            e.target.value = "";
        }
    };

    // Society bar width helper (relative to max)
    const maxSocietyAmount = summary?.bySociety?.length
        ? Math.max(...summary.bySociety.map(s => s.amount))
        : 1;

    return (
        <DataState
            loading={loading}
            error={fetchError}
            onRetry={() => fetchData()}
        >
            <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revenue</h1>
                        <p className="text-slate-500 mt-1">Track royalty earnings across all societies.</p>
                    </div>
                    <Button
                        onClick={() => setShowUpload(!showUpload)}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-2 h-10 shadow-sm transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        Upload Statement
                    </Button>
                </div>

                {/* Fetch Error */}
                {fetchError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 animate-toast-in shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <p className="flex-1">{fetchError}</p>
                        <Button variant="outline" size="sm" onClick={() => fetchData()} className="bg-white border-red-200 text-red-700 hover:bg-red-100">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Upload Panel */}
                {showUpload && (
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900">Import Royalty Statement</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Upload a CSV from ASCAP, BMI, The MLC, or SoundExchange. Format is auto-detected.
                                    </p>
                                </div>
                                <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-3 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? "border-amber-300 bg-amber-100/50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50"}`}>
                                    <input
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    {uploading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span className="text-sm text-amber-700">Processing...</span></>
                                    ) : (
                                        <><Upload className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-600">Click to select CSV file</span></>
                                    )}
                                </label>
                            </div>

                            {/* Upload result */}
                            {uploadResult && (
                                <div className={`mt-4 p-3 rounded-lg text-sm ${uploadResult.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                                    {uploadResult.success ? (
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold">Statement imported!</p>
                                                <p className="text-xs mt-0.5">
                                                    {uploadResult.source} · {uploadResult.period} · {formatMoney(uploadResult.totalAmount)} across {uploadResult.totalLines} lines · {uploadResult.matched} matched, {uploadResult.unmatched} unmatched
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <p>{uploadResult.error || "Import failed"}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-sm text-slate-500">Total Earned</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{formatMoney(summary?.totalEarned || 0)}</p>
                            {summary?.periodChange !== null && summary?.periodChange !== undefined && (
                                <p className={`text-xs mt-1 flex items-center gap-1 ${summary.periodChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                    {summary.periodChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(summary.periodChange).toFixed(1)}% vs last period
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-amber-600" />
                                </div>
                                <p className="text-sm text-slate-500">Top Society</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{summary?.topSociety?.name || "—"}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                {summary?.topSociety ? formatMoney(summary.topSociety.amount) : "No data yet"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <p className="text-sm text-slate-500">Statements</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{summary?.totalStatements || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Latest: {summary?.latestPeriod || "—"}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="text-sm text-slate-500">Discrepancies</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{discrepancies?.open || 0}</p>
                            <p className="text-xs text-red-500 mt-1">
                                {discrepancies?.totalImpact ? `${formatMoney(discrepancies.totalImpact)} potential impact` : "No issues"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Society Breakdown */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-amber-500" />
                                Revenue by Society
                            </h3>
                            {summary?.bySociety && summary.bySociety.length > 0 ? (
                                <div className="space-y-3">
                                    {summary.bySociety
                                        .sort((a, b) => b.amount - a.amount)
                                        .map(s => (
                                            <div key={s.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-slate-700">{s.name}</span>
                                                    <span className="text-sm font-semibold text-slate-900">{formatMoney(s.amount)}</span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${(s.amount / maxSocietyAmount) * 100}%`,
                                                            backgroundColor: SOCIETY_COLORS[s.name] || "#94a3b8",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-8">Upload a statement to see revenue breakdown.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Earning Works */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Top Earning Works
                            </h3>
                            {topWorks.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {topWorks.slice(0, 10).map((work, i) => (
                                        <div key={work.workId || i} className="flex items-center justify-between py-2.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs font-bold text-slate-400 w-5 text-right">
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{work.title || "Untitled"}</p>
                                                    <p className="text-xs text-slate-400">{work.totalUses.toLocaleString()} uses</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold text-emerald-600 flex-shrink-0 ml-3">
                                                {formatMoney(work.totalAmount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-8">No matched works yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Discrepancy Alerts */}
                {discrepancies && discrepancies.findings.length > 0 && (
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    Discrepancy Alerts
                                    <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                                        {discrepancies.open} open
                                    </Badge>
                                </h3>
                                <p className="text-sm font-semibold text-red-600">
                                    {formatMoney(discrepancies.totalImpact)} est. impact
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {discrepancies.findings.slice(0, 8).map(f => (
                                    <div key={f.id} className="py-3 flex items-start gap-3">
                                        <Badge
                                            variant="outline"
                                            className={`text-xs flex-shrink-0 mt-0.5 ${f.severity === "HIGH"
                                                ? "bg-red-50 text-red-600 border-red-200"
                                                : f.severity === "MEDIUM"
                                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                                }`}
                                        >
                                            {f.severity}
                                        </Badge>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-slate-700">{f.description}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-400">
                                                    {f.type.replace("STATEMENT_", "").replace(/_/g, " ")}
                                                </span>
                                                {f.estimatedImpact > 0 && (
                                                    <span className="text-xs font-semibold text-red-500">
                                                        {formatMoney(f.estimatedImpact)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Statements */}
                {summary?.recentStatements && summary.recentStatements.length > 0 && (
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Recent Statements
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left">
                                            <th className="pb-2 text-slate-500 font-medium">Source</th>
                                            <th className="pb-2 text-slate-500 font-medium">Period</th>
                                            <th className="pb-2 text-slate-500 font-medium">File</th>
                                            <th className="pb-2 text-slate-500 font-medium text-right">Lines</th>
                                            <th className="pb-2 text-slate-500 font-medium text-right">Amount</th>
                                            <th className="pb-2 text-slate-500 font-medium text-right">Imported</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {summary.recentStatements.map(st => (
                                            <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                        style={{
                                                            backgroundColor: `${SOCIETY_COLORS[st.source] || "#94a3b8"}15`,
                                                            color: SOCIETY_COLORS[st.source] || "#64748b",
                                                            borderColor: `${SOCIETY_COLORS[st.source] || "#94a3b8"}40`,
                                                        }}
                                                    >
                                                        {st.source}
                                                    </Badge>
                                                </td>
                                                <td className="py-2.5 font-medium text-slate-900">{st.period}</td>
                                                <td className="py-2.5 text-slate-500 truncate max-w-[160px]">{st.fileName || "—"}</td>
                                                <td className="py-2.5 text-right text-slate-600">{st.lineCount.toLocaleString()}</td>
                                                <td className="py-2.5 text-right font-semibold text-emerald-600">{formatMoney(st.totalAmount)}</td>
                                                <td className="py-2.5 text-right text-slate-400 text-xs">
                                                    {new Date(st.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty state */}
                {!summary?.totalStatements && (
                    <Card className="border-slate-200">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                                <DollarSign className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No statements imported yet</h3>
                            <p className="text-sm text-slate-500 text-center max-w-md mb-6">
                                Upload a royalty statement CSV from ASCAP, BMI, The MLC, or SoundExchange
                                to track your earnings and detect discrepancies.
                            </p>
                            <Button
                                onClick={() => setShowUpload(true)}
                                className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Upload Your First Statement
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DataState>
    );
}
