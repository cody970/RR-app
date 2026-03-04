"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    AlertTriangle,
    Download,
    CheckCircle2,
    XCircle,
    Filter,
    Music,
    FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Gap {
    id: string;
    title: string;
    isrc: string | null;
    iswc: string | null;
    artistName: string | null;
    society: string;
    gapType: string;
    confidence: number;
    estimatedImpact: number | null;
    status: string;
    musicbrainzId: string | null;
    createdAt: string;
}

interface ScanDetail {
    scan: {
        id: string;
        status: string;
        totalWorks: number;
        totalRecordings: number;
        unregisteredCount: number;
        scannedCount: number;
        createdAt: string;
    };
    summary: {
        gapsByType: { type: string; count: number }[];
        gapsBySociety: { society: string; count: number }[];
        totalEstimatedImpact: number;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function ScanResultsPage() {
    const params = useParams();
    const scanId = params.id as string;

    const [scanDetail, setScanDetail] = useState<ScanDetail | null>(null);
    const [gaps, setGaps] = useState<Gap[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<string>("");
    const [filterSociety, setFilterSociety] = useState<string>("");

    const fetchScanDetail = useCallback(async () => {
        const res = await fetch(`/api/catalog-scan/${scanId}`);
        if (res.ok) {
            const data = await res.json();
            setScanDetail(data);
        }
    }, [scanId]);

    const fetchGaps = useCallback(
        async (page = 1) => {
            const params = new URLSearchParams({ page: String(page), limit: "25" });
            if (filterType) params.set("gapType", filterType);
            if (filterSociety) params.set("society", filterSociety);

            const res = await fetch(`/api/catalog-scan/${scanId}/gaps?${params}`);
            if (res.ok) {
                const data = await res.json();
                setGaps(data.gaps);
                setPagination(data.pagination);
            }
            setLoading(false);
        },
        [scanId, filterType, filterSociety]
    );

    useEffect(() => {
        fetchScanDetail();
        fetchGaps();
    }, [fetchScanDetail, fetchGaps]);

    const toggleGap = (id: string) => {
        setSelectedGaps((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedGaps.size === gaps.length) {
            setSelectedGaps(new Set());
        } else {
            setSelectedGaps(new Set(gaps.map((g) => g.id)));
        }
    };

    const batchUpdate = async (status: string) => {
        if (selectedGaps.size === 0) return;
        await fetch(`/api/catalog-scan/${scanId}/gaps`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gapIds: Array.from(selectedGaps), status }),
        });
        setSelectedGaps(new Set());
        fetchGaps(pagination?.page || 1);
        fetchScanDetail();
    };

    const exportCSV = () => {
        const headers = ["Title", "ISRC", "ISWC", "Artist", "Society", "Gap Type", "Confidence", "Est. Impact", "Status"];
        const rows = gaps.map((g) => [
            g.title,
            g.isrc || "",
            g.iswc || "",
            g.artistName || "",
            g.society,
            g.gapType,
            String(g.confidence),
            g.estimatedImpact?.toFixed(2) || "",
            g.status,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `catalog-scan-${scanId}-gaps.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const gapTypeLabel = (type: string) => {
        switch (type) {
            case "NO_REGISTRATION": return "No Registration";
            case "MISSING_WORK": return "Missing Work";
            case "MISSING_RECORDING": return "Orphaned Recording";
            case "MISSING_SPLIT": return "Missing ISWC/Split";
            default: return type;
        }
    };

    const gapTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            NO_REGISTRATION: "bg-red-50 text-red-700 border-red-200",
            MISSING_WORK: "bg-amber-50 text-amber-700 border-amber-200",
            MISSING_RECORDING: "bg-blue-50 text-blue-700 border-blue-200",
            MISSING_SPLIT: "bg-purple-50 text-purple-700 border-purple-200",
        };
        return (
            <Badge variant="outline" className={colors[type] || "bg-slate-50 text-slate-700 border-slate-200"}>
                {gapTypeLabel(type)}
            </Badge>
        );
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "OPEN": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Open</Badge>;
            case "REGISTERING": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Registering</Badge>;
            case "REGISTERED": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Registered</Badge>;
            case "DISMISSED": return <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">Dismissed</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/catalog-scan">
                        <Button variant="ghost" size="sm" className="text-slate-500">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Scan Results</h2>
                        <p className="text-slate-500">
                            {scanDetail?.scan.createdAt &&
                                new Date(scanDetail.scan.createdAt).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportCSV} className="border-slate-200">
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {scanDetail && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500 font-medium">Total Gaps</p>
                            <p className="text-3xl font-bold text-slate-900">{scanDetail.scan.unregisteredCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500 font-medium">Revenue at Risk</p>
                            <p className="text-3xl font-bold text-red-600">
                                ${scanDetail.summary.totalEstimatedImpact.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500 font-medium">Works Scanned</p>
                            <p className="text-3xl font-bold text-slate-900">{scanDetail.scan.totalWorks}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500 font-medium">Recordings Scanned</p>
                            <p className="text-3xl font-bold text-slate-900">{scanDetail.scan.totalRecordings}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Gap Type / Society Breakdown */}
            {scanDetail && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Gaps by Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {scanDetail.summary.gapsByType.map((g) => (
                                    <div key={g.type} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">{gapTypeLabel(g.type)}</span>
                                        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700">
                                            {g.count}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Gaps by Society</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {scanDetail.summary.gapsBySociety.map((g) => (
                                    <div key={g.society} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">{g.society}</span>
                                        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                                            {g.count}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Bulk Actions */}
            {selectedGaps.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">{selectedGaps.size} selected</span>
                    <Button size="sm" variant="outline" onClick={() => batchUpdate("REGISTERING")} className="border-amber-300 text-amber-700 hover:bg-amber-100">
                        Mark as Registering
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => batchUpdate("REGISTERED")} className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Registered
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => batchUpdate("DISMISSED")} className="border-slate-300 text-slate-600 hover:bg-slate-100">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Dismiss
                    </Button>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setLoading(true); }}
                    className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-700"
                >
                    <option value="">All Types</option>
                    <option value="NO_REGISTRATION">No Registration</option>
                    <option value="MISSING_WORK">Missing Work</option>
                    <option value="MISSING_RECORDING">Orphaned Recording</option>
                    <option value="MISSING_SPLIT">Missing ISWC/Split</option>
                </select>
                <select
                    value={filterSociety}
                    onChange={(e) => { setFilterSociety(e.target.value); setLoading(true); }}
                    className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-700"
                >
                    <option value="">All Societies</option>
                    <option value="ASCAP">ASCAP</option>
                    <option value="BMI">BMI</option>
                    <option value="ASCAP/BMI">ASCAP/BMI</option>
                    <option value="SESAC">SESAC</option>
                </select>
            </div>

            {/* Gap Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedGaps.size === gaps.length && gaps.length > 0}
                                            onChange={toggleAll}
                                            className="rounded border-slate-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-medium">Title</th>
                                    <th className="px-4 py-3 font-medium">ISRC / ISWC</th>
                                    <th className="px-4 py-3 font-medium">Artist</th>
                                    <th className="px-4 py-3 font-medium">Society</th>
                                    <th className="px-4 py-3 font-medium">Gap Type</th>
                                    <th className="px-4 py-3 font-medium">Confidence</th>
                                    <th className="px-4 py-3 font-medium">Est. Impact</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {gaps.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                                            <Music className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                            <p className="font-medium text-slate-900 mb-1">No gaps found</p>
                                            <p className="text-sm">
                                                {filterType || filterSociety
                                                    ? "Try adjusting your filters"
                                                    : "Your catalog appears fully registered!"}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    gaps.map((gap) => (
                                        <tr key={gap.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGaps.has(gap.id)}
                                                    onChange={() => toggleGap(gap.id)}
                                                    className="rounded border-slate-300"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    {gap.workId ? (
                                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                    ) : (
                                                        <Music className="w-3.5 h-3.5 text-slate-400" />
                                                    )}
                                                    {gap.title}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                {gap.isrc || gap.iswc || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {gap.artistName || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                                                    {gap.society}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">{gapTypeBadge(gap.gapType)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${gap.confidence >= 80
                                                                    ? "bg-emerald-500"
                                                                    : gap.confidence >= 60
                                                                        ? "bg-amber-500"
                                                                        : "bg-red-500"
                                                                }`}
                                                            style={{ width: `${gap.confidence}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-500">{gap.confidence}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 font-medium">
                                                {gap.estimatedImpact != null
                                                    ? `$${gap.estimatedImpact.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">{statusBadge(gap.status)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                            <p className="text-sm text-slate-500">
                                Showing {(pagination.page - 1) * pagination.limit + 1}–
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                                {pagination.total}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => fetchGaps(pagination.page - 1)}
                                    className="border-slate-200"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => fetchGaps(pagination.page + 1)}
                                    className="border-slate-200"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
