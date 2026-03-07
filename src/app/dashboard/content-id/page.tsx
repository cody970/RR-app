"use client";

import { useEffect, useState, useCallback } from "react";
import { SparkButton } from "@/components/spark/spark-button";
import { SparkCard, SparkCardContent } from "@/components/spark/spark-card";
import { SparkBadge } from "@/components/spark/spark-badge";
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
    ExternalLink,
    Eye,
    ShieldCheck,
    ShieldAlert,
    BarChart3,
    Play,
    Video,
    TrendingUp,
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
    totalViews: number;
    totalClaims: number;
    lastCheckedAt: string | null;
    createdAt: string;
}

interface UnregisteredRecording {
    id: string;
    title: string;
    isrc: string | null;
    artist: string | null;
    createdAt: string;
}

interface Usage {
    id: string;
    recordingId: string;
    recordingTitle: string;
    isrc: string | null;
    artist: string | null;
    platform: string;
    videoId: string | null;
    videoTitle: string | null;
    channelName: string | null;
    viewCount: number;
    claimStatus: string;
    estimatedRevenue: number;
    usageDurationSec: number | null;
    detectedAt: string;
}

// ---------- Component ----------

export default function ContentIdPage() {
    const [overview, setOverview] = useState<Overview | null>(null);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [unregistered, setUnregistered] = useState<UnregisteredRecording[]>([]);
    const [usages, setUsages] = useState<Usage[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<"claims" | "unregistered" | "usages">("claims");
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
                setUsages(data.usages || []);
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

    const startScan = async () => {
        setScanning(true);
        try {
            const res = await fetch("/api/content-id/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Content ID scan started. You'll be notified when complete.");
            } else {
                const data = await res.json();
                if (data.error === "A scan is already in progress") {
                    toast.info("A scan is already in progress");
                } else {
                    toast.error("Failed to start scan");
                }
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setScanning(false);
        }
    };

    const formatMoney = (val: number) => {
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toFixed(2)}`;
    };

    const formatViews = (val: number) => {
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toString();
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
                    <SparkButton
                        variant="tertiary"
                        size="sm"
                        onClick={startScan}
                        loading={scanning}
                        aria-label="Scan for content ID usages"
                    >
                        {!scanning && <Play className="h-4 w-4 mr-2" aria-hidden="true" />}
                        Scan for Usages
                    </SparkButton>
                    <SparkButton
                        variant="tertiary"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        aria-label="Refresh content ID data"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                        Refresh
                    </SparkButton>
                </div>
            </div>

            {/* KPI Cards */}
            {overview && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                    <SparkCard variant="default">
                        <SparkCardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Coverage</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{overview.coveragePercent}%</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {overview.monitoredRecordings} of {overview.totalRecordings} recordings
                            </p>
                        </SparkCardContent>
                    </SparkCard>

                    <SparkCard variant="highlighted">
                        <SparkCardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Revenue</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{formatMoney(overview.estimatedRevenue)}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                From {overview.totalPlacements} monitors
                            </p>
                        </SparkCardContent>
                    </SparkCard>

                    <SparkCard variant="warning">
                        <SparkCardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Unmonitored</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{overview.unregisteredRecordings}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Recordings not on Content ID
                            </p>
                        </SparkCardContent>
                    </SparkCard>

                    <SparkCard variant="info">
                        <SparkCardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                                    <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Open Issues</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{overview.openFindings}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Content ID findings
                            </p>
                        </SparkCardContent>
                    </SparkCard>
                </div>
            )}

            {/* Tabs */}
            <div className="px-2">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                    {[
                        { key: "claims" as const, label: "Monitors", icon: Monitor },
                        { key: "usages" as const, label: "Detected Usages", icon: Video },
                        { key: "unregistered" as const, label: "Unmonitored", icon: ShieldAlert },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                activeTab === tab.key
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

            {/* Monitors Tab */}
            {activeTab === "claims" && (
                <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            Active Content ID Monitors
                            <span className="text-xs text-slate-400 font-normal">({claims.length})</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                    ) : claims.length === 0 ? (
                        <div className="p-8 text-center">
                            <Monitor className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No Content ID monitors yet.</p>
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
                                            <SparkBadge variant={claim.platform === "YouTube" ? "error" : claim.platform === "Facebook" ? "info" : "default"}>
                                                {claim.platform}
                                            </SparkBadge>
                                            {claim.totalViews > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-0.5">
                                                        <Eye className="h-3 w-3" />
                                                        {formatViews(claim.totalViews)} views
                                                    </span>
                                                </>
                                            )}
                                            {claim.totalClaims > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{claim.totalClaims} claims</span>
                                                </>
                                            )}
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

            {/* Detected Usages Tab */}
            {activeTab === "usages" && (
                <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Video className="h-4 w-4 text-blue-500" />
                            Detected Content Usages
                            <span className="text-xs text-slate-400 font-normal">({usages.length})</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                    ) : usages.length === 0 ? (
                        <div className="p-8 text-center">
                            <Video className="h-10 w-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                            <p className="text-slate-500 text-sm">No usages detected yet.</p>
                            <p className="text-slate-400 text-xs mt-1">
                                Run a scan to detect where your content is being used.
                            </p>
                            <SparkButton
                                variant="tertiary"
                                size="sm"
                                onClick={startScan}
                                loading={scanning}
                                className="mt-4"
                            >
                                {!scanning && <Play className="h-4 w-4 mr-2" aria-hidden="true" />}
                                Scan for Usages
                            </SparkButton>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {usages.map((usage) => (
                                <div key={usage.id} className="px-6 py-3 flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                        usage.platform === "YouTube" ? "bg-red-50" :
                                        usage.platform === "TikTok" ? "bg-slate-100" :
                                        usage.platform === "Instagram" ? "bg-pink-50" :
                                        "bg-blue-50"
                                    }`}>
                                        <Video className={`h-4 w-4 ${
                                            usage.platform === "YouTube" ? "text-red-600" :
                                            usage.platform === "TikTok" ? "text-slate-700" :
                                            usage.platform === "Instagram" ? "text-pink-600" :
                                            "text-blue-600"
                                        }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-900 truncate">
                                                {usage.videoTitle || "Unknown video"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                            <SparkBadge variant={usage.platform === "YouTube" ? "error" : usage.platform === "Facebook" ? "info" : "default"}>
                                                {usage.platform}
                                            </SparkBadge>
                                            {usage.channelName && (
                                                <>
                                                    <span>•</span>
                                                    <span>{usage.channelName}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                                <Eye className="h-3 w-3" />
                                                {formatViews(usage.viewCount)} views
                                            </span>
                                            <span>•</span>
                                            <span className="text-slate-500">
                                                Uses: {usage.recordingTitle}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium text-emerald-600">
                                            {formatMoney(usage.estimatedRevenue)}
                                        </p>
                                        <SparkBadge variant={
                                            usage.claimStatus === "ACTIVE" ? "success" :
                                            usage.claimStatus === "DISPUTED" ? "warning" :
                                            "outline"
                                        }>
                                            {usage.claimStatus}
                                        </SparkBadge>
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
                            <SparkButton
                                size="sm"
                                variant="primary"
                                onClick={submitForMonitoring}
                                loading={submitting}
                                aria-label={`Submit ${selectedIds.size} recording(s) for Content ID monitoring`}
                            >
                                {!submitting && <Upload className="h-3 w-3 mr-1.5" aria-hidden="true" />}
                                Submit {selectedIds.size} for Monitoring
                            </SparkButton>
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
                                        <SparkBadge variant="warning" className="flex-shrink-0">
                                            Not monitored
                                        </SparkBadge>
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