"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import {
    Shield,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Monitor,
    DollarSign,
    Music,
    Upload,
    Loader2,
    ExternalLink,
    Eye,
    ShieldCheck,
    ShieldAlert,
    BarChart3,
} from "lucide-react";

// ---------- Types ----------

interface Overview {
    totalRecordings: number;
    monitoredRecordings: number;
    unregisteredRecordings: number;
    totalPlacements: number;
    estimatedRevenue: number;
    coveragePercent: number;
    openFindings: number;
}

interface Claim {
    id: string;
    recordingId: string;
    recordingTitle: string;
    isrc: string | null;
    artist: string | null;
    platform: string;
    status: string;
    estimatedRevenue: number;
    createdAt: string;
}

interface UnregisteredRecording {
    id: string;
    title: string;
    isrc: string | null;
    artist: string | null;
    createdAt: string;
}

// ---------- Component ----------

export default function ContentIdPage() {
    const [overview, setOverview] = useState<Overview | null>(null);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [unregistered, setUnregistered] = useState<UnregisteredRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<"overview" | "claims" | "unregistered">("overview");
    const toast = useToast();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/content-id/monitor?view=all");
            if (res.ok) {
                const data = await res.json();
                setOverview(data.overview || null);
                setClaims(data.claims || []);
                setUnregistered(data.unregistered || []);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load Content ID data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === unregistered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(unregistered.map((r) => r.id)));
        }
    };

    const submitForMonitoring = async () => {
        if (selectedIds.size === 0) {
            toast.error("Select recordings to submit");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/content-id/monitor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recordingIds: Array.from(selectedIds),
                    platforms: ["YouTube", "Facebook", "Instagram", "TikTok"],
                    policy: "MONETIZE",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.submitted} recording(s) submitted for Content ID monitoring`);
                setSelectedIds(new Set());
                await fetchData();
            } else {
                toast.error("Failed to submit recordings");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const formatMoney = (val: number) => {
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toFixed(2)}`;
    };

    const platformBadge = (platform: string) => {
        const colors: Record<string, string> = {
            YouTube: "bg-red-100 text-red-700",
            Facebook: "bg-blue-100 text-blue-700",
            Instagram: "bg-pink-100 text-pink-700",
            TikTok: "bg-slate-100 text-slate-700",
        };
        return colors[platform] || "bg-slate-100 text-slate-600";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 px-2">
                        Content ID Monitoring
                    </h1>
                    <p className="text-slate-500 px-2 text-sm">
                        Track and monetize your recordings across social platforms.
                    </p>
                </div>
                <div className="flex gap-2 px-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="h-9"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            {overview && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                    <Card className="border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-indigo-600" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Coverage</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{overview.coveragePercent}%</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {overview.monitoredRecordings} of {overview.totalRecordings} recordings
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Revenue</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{formatMoney(overview.estimatedRevenue)}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                From {overview.totalPlacements} placements
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Unmonitored</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{overview.unregisteredRecordings}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Recordings not on Content ID
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                                    <ShieldAlert className="h-4 w-4 text-red-600" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Open Issues</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{overview.openFindings}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Content ID findings
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <div className="px-2">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                    {[
                        { key: "overview" as const, label: "Claims", icon: Monitor },
                        { key: "unregistered" as const, label: "Unmonitored", icon: ShieldAlert },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key === "overview" ? "claims" : tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                (activeTab === "claims" && tab.key === "overview") || activeTab === tab.key
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Claims Tab */}
            {(activeTab === "claims" || activeTab === "overview") && (
                <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            Active Content ID Claims
                            <span className="text-xs text-slate-400 font-normal">({claims.length})</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                    ) : claims.length === 0 ? (
                        <div className="p-8 text-center">
                            <Monitor className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No Content ID claims yet.</p>
                            <p className="text-slate-400 text-xs mt-1">
                                Submit recordings for monitoring to start tracking claims.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {claims.map((claim) => (
                                <div key={claim.id} className="px-6 py-3 flex items-center gap-3">
                                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-900 truncate">
                                                {claim.recordingTitle}
                                            </span>
                                            {claim.isrc && (
                                                <code className="text-[10px] text-slate-400 font-mono">{claim.isrc}</code>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                            {claim.artist && <span>{claim.artist}</span>}
                                            <span>•</span>
                                            {claim.platform.split(",").map((p) => (
                                                <span
                                                    key={p}
                                                    className={`px-1.5 py-0.5 rounded ${platformBadge(p.trim())}`}
                                                >
                                                    {p.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium text-emerald-600">
                                            {formatMoney(claim.estimatedRevenue)}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {claim.status}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Unregistered Tab */}
            {activeTab === "unregistered" && (
                <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-amber-500" />
                            Unmonitored Recordings
                            <span className="text-xs text-slate-400 font-normal">({unregistered.length})</span>
                        </h2>
                        {selectedIds.size > 0 && (
                            <Button
                                size="sm"
                                onClick={submitForMonitoring}
                                disabled={submitting}
                                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                            >
                                {submitting ? (
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                ) : (
                                    <Upload className="h-3 w-3 mr-1.5" />
                                )}
                                Submit {selectedIds.size} for Monitoring
                            </Button>
                        )}
                    </div>

                    {unregistered.length === 0 ? (
                        <div className="p-8 text-center">
                            <ShieldCheck className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">All recordings are monitored!</p>
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50">
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === unregistered.length}
                                        onChange={selectAll}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Select all ({unregistered.length})
                                </label>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {unregistered.map((rec) => (
                                    <div key={rec.id} className="px-6 py-3 flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(rec.id)}
                                            onChange={() => toggleSelect(rec.id)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <Music className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-slate-900 truncate block">
                                                {rec.title}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                {rec.artist && <span>{rec.artist}</span>}
                                                {rec.isrc && (
                                                    <>
                                                        <span>•</span>
                                                        <code className="font-mono">{rec.isrc}</code>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex-shrink-0">
                                            Not monitored
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}