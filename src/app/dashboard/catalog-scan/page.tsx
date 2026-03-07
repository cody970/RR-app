"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2, AlertTriangle, CheckCircle2, Clock, DollarSign, FileSearch, ArrowRight, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEventStream } from "@/hooks/useEventStream";

interface CatalogScan {
    id: string;
    status: string;
    totalWorks: number;
    totalRecordings: number;
    unregisteredCount: number;
    scannedCount: number;
    error: string | null;
    createdAt: string;
    _count: { gaps: number };
}

export default function CatalogScanPage() {
    const [scans, setScans] = useState<CatalogScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [liveProgress, setLiveProgress] = useState<{
        scannedItems: number;
        totalItems: number;
        gapsFound: number;
        percentComplete: number;
    } | null>(null);

    // Real-time scan updates via SSE (replaces 5-second polling)
    const { isConnected } = useEventStream({
        filter: ["scan.progress", "scan.completed", "scan.failed"],
        onEvent: (event) => {
            if (event.type === "scan.progress") {
                setLiveProgress({
                    scannedItems: event.data.scannedItems,
                    totalItems: event.data.totalItems,
                    gapsFound: event.data.gapsFound,
                    percentComplete: event.data.percentComplete,
                });
            } else if (event.type === "scan.completed" || event.type === "scan.failed") {
                setLiveProgress(null);
                fetchScans(); // Refresh the scan list
            }
        },
    });

    const fetchScans = useCallback(async () => {
        try {
            const res = await fetch("/api/catalog-scan");
            const data = await res.json();
            setScans(data.scans || []);
        } catch (e) {
            console.error("Failed to load scans:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScans();
        // Fallback polling only if SSE is not connected (reduced frequency)
        const interval = setInterval(() => {
            if (!isConnected && scans.some((s) => s.status === "SCANNING" || s.status === "PENDING")) {
                fetchScans();
            }
        }, 15000); // 15s fallback instead of 5s
        return () => clearInterval(interval);
    }, [fetchScans, scans, isConnected]);

    const startScan = async () => {
        setScanning(true);
        try {
            const res = await fetch("/api/catalog-scan", { method: "POST" });
            if (res.ok) {
                await fetchScans();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to start scan");
            }
        } catch (e) {
            console.error("Start scan error:", e);
        } finally {
            setScanning(false);
        }
    };

    const latestScan = scans[0];
    const totalGapsEver = scans.reduce((sum, s) => sum + s.unregisteredCount, 0);

    const statusBadge = (status: string) => {
        switch (status) {
            case "COMPLETE":
                return (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                    </Badge>
                );
            case "SCANNING":
            case "PENDING":
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {status === "SCANNING" ? "Scanning..." : "Queued"}
                    </Badge>
                );
            case "FAILED":
                return (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Failed
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Unregistered Catalog Scanner
                    </h2>
                    <p className="text-slate-500">
                        Discover works and recordings missing PRO registrations at ASCAP, BMI, and SESAC
                    </p>
                </div>
                <Button
                    onClick={startScan}
                    disabled={scanning || scans.some((s) => s.status === "SCANNING" || s.status === "PENDING")}
                    className="bg-amber-500 hover:bg-amber-600 text-white border-0"
                >
                    {scanning ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 mr-2" />
                    )}
                    {scanning ? "Starting..." : "Start New Scan"}
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <FileSearch className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Scans</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loading ? "—" : scans.length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Gaps Found</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loading ? "—" : latestScan?.unregisteredCount || 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Items Scanned</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loading
                                        ? "—"
                                        : latestScan
                                            ? latestScan.totalWorks + latestScan.totalRecordings
                                            : 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Scan Progress — uses real-time SSE data when available */}
            {latestScan && (latestScan.status === "SCANNING" || latestScan.status === "PENDING") && (
                <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                            <p className="font-semibold text-amber-900">Scan in Progress</p>
                            {isConnected && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">
                                    <Wifi className="w-2.5 h-2.5 mr-1" /> Live
                                </Badge>
                            )}
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-2.5">
                            <div
                                className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                                style={{
                                    width: `${liveProgress
                                        ? liveProgress.percentComplete
                                        : latestScan.totalWorks + latestScan.totalRecordings > 0
                                            ? (latestScan.scannedCount /
                                                (latestScan.totalWorks + latestScan.totalRecordings)) *
                                            100
                                            : 0
                                        }%`,
                                }}
                            />
                        </div>
                        <p className="text-sm text-amber-700 mt-2">
                            Scanned {liveProgress?.scannedItems ?? latestScan.scannedCount} of{" "}
                            {liveProgress?.totalItems ?? (latestScan.totalWorks + latestScan.totalRecordings)} items •{" "}
                            {liveProgress?.gapsFound ?? latestScan.unregisteredCount} gaps found so far
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Scan History */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Scan History</CardTitle>
                    <CardDescription>
                        Previous catalog scans and their results
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : scans.length === 0 ? (
                        <div className="text-center py-12">
                            <FileSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="font-medium text-slate-900 mb-1">No scans yet</p>
                            <p className="text-sm text-slate-500">
                                Start your first scan to discover unregistered catalog items
                            </p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Works</th>
                                        <th className="px-4 py-3 font-medium">Recordings</th>
                                        <th className="px-4 py-3 font-medium">Gaps Found</th>
                                        <th className="px-4 py-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {scans.map((scan) => (
                                        <tr key={scan.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(scan.createdAt).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{statusBadge(scan.status)}</td>
                                            <td className="px-4 py-3 text-slate-700 font-medium">
                                                {scan.totalWorks}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 font-medium">
                                                {scan.totalRecordings}
                                            </td>
                                            <td className="px-4 py-3">
                                                {scan.unregisteredCount > 0 ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-red-50 text-red-700 border-red-200"
                                                    >
                                                        {scan.unregisteredCount} gaps
                                                    </Badge>
                                                ) : scan.status === "COMPLETE" ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    >
                                                        All clear
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {scan.status === "COMPLETE" && scan.unregisteredCount > 0 && (
                                                    <Link href={`/dashboard/catalog-scan/${scan.id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-amber-600 hover:text-amber-700"
                                                        >
                                                            View Results
                                                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
