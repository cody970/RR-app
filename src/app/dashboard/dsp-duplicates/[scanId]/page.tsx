"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Copy,
    Music2, DollarSign, TrendingUp, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast-provider";

// ---------- Types ----------

interface DspDuplicateScan {
    id: string;
    status: string;
    totalArtists: number;
    duplicatesFound: number;
    createdAt: string;
}

interface DspDuplicateGroup {
    id: string;
    canonicalName: string;
    aliases: string[];
    dsps: string[];
    totalStreams: number;
    estimatedRevenue: string;
    confidence: number;
    status: string;
}

// ---------- Helpers ----------

function confidenceBadge(confidence: number) {
    if (confidence >= 90) {
        return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                High ({confidence}%)
            </Badge>
        );
    }
    if (confidence >= 75) {
        return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                Medium ({confidence}%)
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
            Low ({confidence}%)
        </Badge>
    );
}

function groupStatusBadge(status: string) {
    switch (status) {
        case "RESOLVED":
            return (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
                </Badge>
            );
        case "REVIEWED":
            return (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                    Reviewed
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                    Open
                </Badge>
            );
    }
}

// ---------- Page ----------

export default function DspDuplicateScanDetailPage() {
    const params = useParams<{ scanId: string }>();
    const scanId = params.scanId;
    const toast = useToast();

    const [scan, setScan] = useState<DspDuplicateScan | null>(null);
    const [groups, setGroups] = useState<DspDuplicateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchResults = useCallback(async () => {
        if (!scanId) return;
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const res = await fetch(`/api/dsp-duplicates/${scanId}${params}`);
            if (res.ok) {
                const data = await res.json();
                setScan(data.scan);
                setGroups(data.groups);
            }
        } catch (e) {
            console.error("Failed to load scan results:", e);
        } finally {
            setLoading(false);
        }
    }, [scanId, statusFilter]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    const updateGroupStatus = async (groupId: string, status: "REVIEWED" | "RESOLVED") => {
        setUpdatingId(groupId);
        try {
            const res = await fetch(`/api/dsp-duplicates/${scanId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId, status }),
            });
            if (res.ok) {
                setGroups((prev) =>
                    prev.map((g) => (g.id === groupId ? { ...g, status } : g))
                );
                toast.success(`Group marked as ${status.toLowerCase()}`);
            } else {
                toast.error("Failed to update group status");
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const totalEstimatedRevenue = groups.reduce(
        (sum, g) => sum + parseFloat(g.estimatedRevenue || "0"),
        0
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!scan) {
        return (
            <div className="text-center py-24">
                <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Scan not found.</p>
                <Link href="/dashboard/dsp-duplicates" className="mt-4 inline-block">
                    <Button variant="ghost" className="text-amber-600">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to scans
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <Link href="/dashboard/dsp-duplicates">
                        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500 hover:text-slate-700">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Duplicate Profile Results
                    </h2>
                    <p className="text-slate-500">
                        Scan from{" "}
                        {new Date(scan.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })}
                        {" · "}
                        {scan.totalArtists} unique artists scanned
                    </p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All groups</option>
                        <option value="OPEN">Open</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="RESOLVED">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <Copy className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Duplicate Groups</p>
                                <p className="text-2xl font-bold text-slate-900">{scan.duplicatesFound}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Resolved</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {groups.filter((g) => g.status === "RESOLVED").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Revenue Affected</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    ${totalEstimatedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Groups Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Duplicate Artist Profiles</CardTitle>
                    <CardDescription>
                        Artists whose names appear differently across DSPs. Consolidating these profiles
                        ensures accurate stream attribution and royalty recovery.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {groups.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                            <p className="font-medium text-slate-900 mb-1">No duplicate profiles found</p>
                            <p className="text-sm text-slate-500">
                                {statusFilter
                                    ? "Try changing the status filter."
                                    : "All artist profiles appear consistent across your DSPs."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groups.map((group) => (
                                <div
                                    key={group.id}
                                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Canonical name + confidence */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Music2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                <span className="font-semibold text-slate-900 truncate">
                                                    {group.canonicalName}
                                                </span>
                                                {confidenceBadge(group.confidence)}
                                                {groupStatusBadge(group.status)}
                                            </div>

                                            {/* Aliases */}
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {group.aliases.map((alias) => (
                                                    <span
                                                        key={alias}
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                                            alias === group.canonicalName
                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                : "bg-slate-50 text-slate-600 border-slate-200"
                                                        }`}
                                                    >
                                                        {alias}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* DSPs + stats */}
                                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    {group.totalStreams.toLocaleString()} streams
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3.5 h-3.5" />
                                                    $
                                                    {parseFloat(group.estimatedRevenue).toLocaleString("en-US", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{" "}
                                                    revenue
                                                </span>
                                                <span>
                                                    DSPs:{" "}
                                                    {group.dsps.map((d) => (
                                                        <span
                                                            key={d}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] mx-0.5"
                                                        >
                                                            {d}
                                                        </span>
                                                    ))}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {group.status !== "RESOLVED" && (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {group.status === "OPEN" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs"
                                                        disabled={updatingId === group.id}
                                                        onClick={() => updateGroupStatus(group.id, "REVIEWED")}
                                                    >
                                                        {updatingId === group.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            "Mark Reviewed"
                                                        )}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs"
                                                    disabled={updatingId === group.id}
                                                    onClick={() => updateGroupStatus(group.id, "RESOLVED")}
                                                >
                                                    {updatingId === group.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        "Resolve"
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
