"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Search, Loader2, AlertTriangle, CheckCircle2, Clock,
    Users, FileSearch, ArrowRight, Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------

interface DspDuplicateScan {
    id: string;
    status: string;
    totalArtists: number;
    duplicatesFound: number;
    error: string | null;
    createdAt: string;
    _count: { groups: number };
}

// ---------- Helpers ----------

function statusBadge(status: string) {
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
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {status === "SCANNING" ? "Scanning…" : "Queued"}
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
}

// ---------- Page ----------

export default function DspDuplicatesPage() {
    const [scans, setScans] = useState<DspDuplicateScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);

    const fetchScans = useCallback(async () => {
        try {
            const res = await fetch("/api/dsp-duplicates");
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
        const interval = setInterval(() => {
            if (scans.some((s) => s.status === "SCANNING" || s.status === "PENDING")) {
                fetchScans();
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchScans, scans]);

    const startScan = async () => {
        setScanning(true);
        try {
            const res = await fetch("/api/dsp-duplicates", { method: "POST" });
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        DSP Duplicate Profile Detector
                    </h2>
                    <p className="text-slate-500">
                        Find artists whose profiles appear under different names across Spotify, Apple Music, Tidal, and other DSPs
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
                    {scanning ? "Starting…" : "Start New Scan"}
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
                                <Copy className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Duplicates Found (Latest)</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loading ? "—" : latestScan?.duplicatesFound ?? 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Unique Artists Scanned</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loading ? "—" : latestScan?.totalArtists ?? 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Scan Progress */}
            {latestScan && (latestScan.status === "SCANNING" || latestScan.status === "PENDING") && (
                <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                            <p className="font-semibold text-amber-900">Scan in Progress</p>
                        </div>
                        <p className="text-sm text-amber-700">
                            Comparing artist names across all your DSP reports. This may take a moment…
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Scan History */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Scan History</CardTitle>
                    <CardDescription>Previous duplicate profile scans and their results</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : scans.length === 0 ? (
                        <div className="text-center py-12">
                            <Copy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="font-medium text-slate-900 mb-1">No scans yet</p>
                            <p className="text-sm text-slate-500">
                                Start your first scan to detect duplicate artist profiles across DSPs
                            </p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Artists Scanned</th>
                                        <th className="px-4 py-3 font-medium">Duplicates Found</th>
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
                                                {scan.totalArtists}
                                            </td>
                                            <td className="px-4 py-3">
                                                {scan.duplicatesFound > 0 ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-red-50 text-red-700 border-red-200"
                                                    >
                                                        {scan.duplicatesFound} duplicate{scan.duplicatesFound !== 1 ? "s" : ""}
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
                                                {scan.status === "COMPLETE" && scan.duplicatesFound > 0 && (
                                                    <Link href={`/dashboard/dsp-duplicates/${scan.id}`}>
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
