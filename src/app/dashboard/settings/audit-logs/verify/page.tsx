"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Shield,
    CheckCircle2,
    XCircle,
    Loader2,
    Download,
    Plus,
    RefreshCw,
    Link2,
    Hash,
    Clock,
    FileText,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    ShieldCheck,
    ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

/* ---------- Types ---------- */

interface Checkpoint {
    id: string;
    merkleRoot: string;
    logCount: number;
    periodStart: string;
    periodEnd: string;
    previousHash: string | null;
    anchorTxHash: string | null;
    anchorChain: string | null;
    anchorStatus: string;
    verifiedAt: string | null;
    createdAt: string;
}

interface VerificationResult {
    valid: boolean;
    checkpointId: string;
    merkleRoot: string;
    recomputedRoot: string;
    logCount: number;
    chainValid: boolean;
    details: string;
}

interface Pagination {
    total: number;
    pages: number;
    currentPage: number;
}

/* ---------- Component ---------- */

export default function AuditVerifyPage() {
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, pages: 1, currentPage: 1 });
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [verifying, setVerifying] = useState<Record<string, boolean>>({});
    const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult>>({});
    const [exporting, setExporting] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);

    /* ---------- Fetch ---------- */

    const fetchCheckpoints = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/audit-logs/checkpoints?page=${page}&limit=15`);
            if (!res.ok) throw new Error("Failed to load checkpoints");
            const data = await res.json();
            setCheckpoints(data.checkpoints);
            setPagination(data.pagination);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCheckpoints();
    }, [fetchCheckpoints]);

    /* ---------- Create ---------- */

    const handleCreate = async () => {
        setCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/audit-logs/checkpoints", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create checkpoint");
            await fetchCheckpoints();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setCreating(false);
        }
    };

    /* ---------- Verify ---------- */

    const handleVerify = async (id: string) => {
        setVerifying((prev) => ({ ...prev, [id]: true }));
        try {
            const res = await fetch(`/api/audit-logs/checkpoints/${id}?action=verify`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Verification failed");
            setVerificationResults((prev) => ({ ...prev, [id]: data.verification }));
            setExpandedId(id);
            // Refresh to get updated verifiedAt
            await fetchCheckpoints(pagination.currentPage);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setVerifying((prev) => ({ ...prev, [id]: false }));
        }
    };

    /* ---------- Export ---------- */

    const handleExport = async (id: string) => {
        setExporting((prev) => ({ ...prev, [id]: true }));
        try {
            const res = await fetch(`/api/audit-logs/checkpoints/${id}?action=export`);
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `checkpoint-${id}-bundle.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setExporting((prev) => ({ ...prev, [id]: false }));
        }
    };

    /* ---------- Helpers ---------- */

    const anchorBadge = (status: string) => {
        switch (status) {
            case "ANCHORED":
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Anchored</Badge>;
            case "FAILED":
                return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>;
            default:
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
        }
    };

    /* ---------- Render ---------- */

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-slate-700" />
                        Audit Verification
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Merkle-tree checkpoints for tamper-proof audit trail verification.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => fetchCheckpoints(pagination.currentPage)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-sm disabled:opacity-50 transition-all"
                    >
                        {creating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        Create Checkpoint
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="text-xs text-red-600 underline mt-1"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {!loading && checkpoints.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{pagination.total}</p>
                                <p className="text-xs text-slate-500">Total Checkpoints</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {checkpoints.filter((cp) => cp.verifiedAt).length}
                                </p>
                                <p className="text-xs text-slate-500">Verified (this page)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {checkpoints.reduce((sum, cp) => sum + cp.logCount, 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">Logs Covered (this page)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkpoint List */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                {loading ? (
                    <div className="px-6 py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
                        <p className="text-slate-500 mt-4">Loading checkpoints...</p>
                    </div>
                ) : checkpoints.length === 0 ? (
                    <div className="px-6 py-20 text-center">
                        <Shield className="h-12 w-12 text-slate-300 mx-auto" />
                        <p className="text-slate-500 mt-4 font-medium">No checkpoints yet</p>
                        <p className="text-slate-400 text-sm mt-1">
                            Create your first checkpoint to start building a verifiable audit chain.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {checkpoints.map((cp) => {
                            const isExpanded = expandedId === cp.id;
                            const result = verificationResults[cp.id];
                            const isVerifying = verifying[cp.id];
                            const isExporting = exporting[cp.id];

                            return (
                                <div key={cp.id} className="group">
                                    {/* Row */}
                                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-slate-50/50 transition-colors">
                                        {/* Left: Info */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-slate-900 font-mono">
                                                    {cp.merkleRoot.substring(0, 16)}…
                                                </span>
                                                {anchorBadge(cp.anchorStatus)}
                                                {cp.verifiedAt && (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Verified
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(cp.createdAt), "MMM d, yyyy HH:mm")}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    {cp.logCount.toLocaleString()} logs
                                                </span>
                                                {cp.previousHash && (
                                                    <span className="flex items-center gap-1">
                                                        <Link2 className="h-3 w-3" />
                                                        Chained
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleVerify(cp.id)}
                                                disabled={isVerifying}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all"
                                            >
                                                {isVerifying ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Shield className="h-3.5 w-3.5" />
                                                )}
                                                Verify
                                            </button>
                                            <button
                                                onClick={() => handleExport(cp.id)}
                                                disabled={isExporting}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all"
                                            >
                                                {isExporting ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Download className="h-3.5 w-3.5" />
                                                )}
                                                Export
                                            </button>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : cp.id)}
                                                className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="px-6 pb-5 bg-slate-50/50 border-t border-slate-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                {/* Checkpoint Details */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                        Checkpoint Details
                                                    </h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            <Hash className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Merkle Root</span>
                                                                <p className="font-mono text-xs text-slate-700 break-all">
                                                                    {cp.merkleRoot}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {cp.previousHash && (
                                                            <div className="flex items-start gap-2">
                                                                <Link2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <span className="text-slate-500 text-xs">Previous Hash</span>
                                                                    <p className="font-mono text-xs text-slate-700 break-all">
                                                                        {cp.previousHash}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-start gap-2">
                                                            <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Period</span>
                                                                <p className="text-xs text-slate-700">
                                                                    {format(new Date(cp.periodStart), "MMM d, yyyy HH:mm")}
                                                                    {" → "}
                                                                    {format(new Date(cp.periodEnd), "MMM d, yyyy HH:mm")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {cp.anchorTxHash && (
                                                            <div className="flex items-start gap-2">
                                                                <Link2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <span className="text-slate-500 text-xs">
                                                                        Blockchain Anchor ({cp.anchorChain})
                                                                    </span>
                                                                    <p className="font-mono text-xs text-slate-700 break-all">
                                                                        {cp.anchorTxHash}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Verification Result */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                        Verification Result
                                                    </h4>
                                                    {result ? (
                                                        <div
                                                            className={`rounded-xl border p-4 ${
                                                                result.valid
                                                                    ? "bg-emerald-50 border-emerald-200"
                                                                    : "bg-red-50 border-red-200"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 mb-3">
                                                                {result.valid ? (
                                                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                                                ) : (
                                                                    <ShieldAlert className="h-5 w-5 text-red-600" />
                                                                )}
                                                                <span
                                                                    className={`text-sm font-semibold ${
                                                                        result.valid ? "text-emerald-800" : "text-red-800"
                                                                    }`}
                                                                >
                                                                    {result.valid
                                                                        ? "Integrity Verified ✓"
                                                                        : "Integrity Check Failed ✗"}
                                                                </span>
                                                            </div>
                                                            <p
                                                                className={`text-xs ${
                                                                    result.valid ? "text-emerald-700" : "text-red-700"
                                                                }`}
                                                            >
                                                                {result.details}
                                                            </p>
                                                            <div className="mt-3 space-y-1">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span
                                                                        className={
                                                                            result.valid
                                                                                ? "text-emerald-600"
                                                                                : "text-red-600"
                                                                        }
                                                                    >
                                                                        Root Match:
                                                                    </span>
                                                                    <span className="font-mono text-[10px]">
                                                                        {result.merkleRoot === result.recomputedRoot
                                                                            ? "✓ Match"
                                                                            : "✗ Mismatch"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span
                                                                        className={
                                                                            result.chainValid
                                                                                ? "text-emerald-600"
                                                                                : "text-red-600"
                                                                        }
                                                                    >
                                                                        Chain Link:
                                                                    </span>
                                                                    <span className="font-mono text-[10px]">
                                                                        {result.chainValid
                                                                            ? "✓ Intact"
                                                                            : "✗ Broken"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span
                                                                        className={
                                                                            result.valid
                                                                                ? "text-emerald-600"
                                                                                : "text-red-600"
                                                                        }
                                                                    >
                                                                        Log Count:
                                                                    </span>
                                                                    <span className="font-mono text-[10px]">
                                                                        {result.logCount} logs verified
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                                                            <Shield className="h-8 w-8 text-slate-300 mx-auto" />
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Click &quot;Verify&quot; to recompute the Merkle root
                                                                and validate checkpoint integrity.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            Page {pagination.currentPage} of {pagination.pages} ({pagination.total} checkpoints)
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchCheckpoints(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="px-3 py-1 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchCheckpoints(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.pages}
                                className="px-3 py-1 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                <Shield className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">How Verification Works</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Each checkpoint computes a <strong>Merkle root</strong> — a single cryptographic hash
                        representing all audit log entries in the period. Checkpoints are <strong>chained</strong> together:
                        each root incorporates the previous checkpoint&apos;s root, creating a tamper-evident chain.
                        Verification recomputes the Merkle root from the raw logs and compares it to the stored value.
                        Any modification to any log entry will produce a different root, immediately revealing tampering.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-2">
                        <strong>Export</strong> a verification bundle to independently verify checkpoint integrity
                        without database access. The bundle includes all log hashes, the Merkle tree, and
                        blockchain anchor references (when available).
                    </p>
                </div>
            </div>
        </div>
    );
}