"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, FileWarning, Play, RefreshCw, Download, Coins, ShieldAlert, CheckCircle2, History as HistoryIcon, Share, Search, Filter, X, CheckSquare } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { Finding } from "@/types";
import { exportToCSV, exportToJSON, generateDisputeLetter } from "@/lib/reports/export-utils";
import { generateAuditPDF } from "@/lib/reports/pdf-utils";
import { useSession } from "next-auth/react";
import { TaskBoard } from "@/components/dashboard/task-board";
import { LayoutGrid, List as ListIcon, Sparkles } from "lucide-react";

export default function AuditEnginePage() {
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "board">("list");
    const [applyingFixId, setApplyingFixId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
    const toast = useToast();

    const { data: session } = useSession();

    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });

    // Filter state
    const [filterType, setFilterType] = useState("");
    const [filterSeverity, setFilterSeverity] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Bulk selection state
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const allSelected = findings.length > 0 && selected.size === findings.length;

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(findings.map(f => f.id)));
        }
    };

    const bulkAction = async (action: string, status?: string) => {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        try {
            const res = await fetch("/api/findings/bulk", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, action, status }),
            });
            if (res.ok) {
                toast.success(`Bulk action completed on ${ids.length} findings`);
                setSelected(new Set());
                await fetchFindings();
            }
        } catch {
            toast.error("Bulk action failed");
        }
    };

    const fetchFindings = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: String(page), limit: "50" });
            if (filterType) params.set("type", filterType);
            if (filterSeverity) params.set("severity", filterSeverity);
            if (filterStatus) params.set("status", filterStatus);
            if (searchQuery) params.set("search", searchQuery);
            const res = await fetch(`/api/findings?${params}`);
            if (res.ok) {
                const data = await res.json();
                setFindings(data.findings);
                setPagination(data.pagination);
                setSelected(new Set());
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load anomalies");
        } finally {
            setLoading(false);
        }
    }, [filterType, filterSeverity, filterStatus, searchQuery]);

    useEffect(() => {
        fetchFindings();
    }, [fetchFindings]);

    const clearFilters = () => {
        setFilterType("");
        setFilterSeverity("");
        setFilterStatus("");
        setSearchQuery("");
    };

    const hasFilters = filterType || filterSeverity || filterStatus || searchQuery;

    const downloadPDF = async () => {
        try {
            toast.success("Preparing PDF report...");
            const res = await fetch("/api/analytics/stats");
            if (!res.ok) throw new Error("Failed to fetch analytics");
            const stats = await res.json();

            generateAuditPDF({
                orgName: session?.user?.email?.split('@')[0] || "Organization",
                totalItems: stats.totalItems,
                healthScore: stats.healthScore,
                totalLeakage: stats.totalLeakage,
                findings: findings.slice(0, 10)
            });

            toast.success("PDF Report generated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        }
    };

    const shareRecovery = (finding: Finding) => {
        const amount = finding.recoveredAmount || finding.estimatedImpact || 0;
        const text = `Just recovered $${amount.toFixed(2)} in royalty leakage with RoyaltyRadar! 🚀 #RoyaltyRadar #MusicIndustry`;
        navigator.clipboard.writeText(text);
        toast.success("Success story copied to clipboard!");
    };

    const runAudit = async () => {
        setRunning(true);
        setError("");
        try {
            const res = await fetch("/api/audit/run", { method: "POST" });
            if (!res.ok) {
                const msg = await res.text() || "Audit engine failed to start";
                setError(msg);
                toast.error(msg);
                setRunning(false);
                return;
            }

            const { jobId } = await res.json();
            toast.success("Audit job started...");

            // Poll for job status
            const pollJob = async () => {
                try {
                    const statusRes = await fetch(`/api/audit/jobs/${jobId}`);
                    if (!statusRes.ok) throw new Error("Failed to poll job status");

                    const job = await statusRes.json();

                    if (job.status === "COMPLETED") {
                        toast.success(`Audit complete — ${job.findingsCount} findings detected`);
                        await fetchFindings();
                        setRunning(false);
                    } else if (job.status === "FAILED") {
                        setError(job.error || "Audit job failed");
                        toast.error("Audit performance error");
                        setRunning(false);
                    } else {
                        // Still processing, poll again in 2s
                        setTimeout(pollJob, 2000);
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                    setError("Lost connection to audit worker");
                    setRunning(false);
                }
            };

            pollJob();

        } catch (err) {
            setError("An unexpected error occurred");
            toast.error("An unexpected error occurred");
            setRunning(false);
        }
    };

    const handleExport = (type: "csv" | "json") => {
        const filename = `RoyaltyRadar_Findings_${new Date().toISOString().split('T')[0]}`;
        if (type === "csv") {
            const exportData = findings.map(f => ({
                Severity: f.severity,
                Type: f.type,
                ResourceId: f.resourceId,
                Confidence: `${f.confidence}%`,
                EstimatedImpact: f.estimatedImpact,
                OrgId: f.orgId
            }));
            exportToCSV(filename, exportData);
        } else {
            exportToJSON(filename, findings);
        }
        toast.success(`Exported ${type.toUpperCase()} successfully`);
    };

    const createTask = async (findingId: string) => {
        setCreatingTaskId(findingId);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ findingId, notes: "Auto-generated task from finding" }),
            });
            if (res.ok) {
                toast.success("Task created successfully!");
            } else {
                toast.error("Failed to create task");
            }
        } catch (e) {
            console.error("Failed to create task", e);
            toast.error("Failed to create task");
        } finally {
            setCreatingTaskId(null);
        }
    };

    const updateRecovery = async (id: string, status: string, amount?: number) => {
        try {
            const res = await fetch(`/api/findings/${id}/recovery`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, recoveredAmount: amount }),
            });
            if (res.ok) {
                toast.success(`Marked as ${status}`);
                await fetchFindings();
            } else {
                toast.error("Failed to update status");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error updating status");
        }
    };

    const applyMetadataFix = async (findingId: string, fix: any) => {
        setApplyingFixId(`${findingId}-${fix.field}`);
        try {
            const finding = findings.find(f => f.id === findingId);
            if (!finding) return;

            const res = await fetch("/api/enrich/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceType: finding.resourceType,
                    resourceId: finding.resourceId,
                    field: fix.field,
                    value: fix.value
                }),
            });

            if (res.ok) {
                toast.success(`Successfully updated ${fix.field}!`);
                await fetchFindings();
            } else {
                toast.error("Failed to apply healing fix");
            }
        } catch (e) {
            toast.error("Error connecting to enrichment engine");
        } finally {
            setApplyingFixId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 px-2">Audit Engine</h1>
                    <p className="text-slate-500 px-2">
                        Detect unregistered publishing, metadata conflicts, and calculate leakage.
                    </p>
                </div>
                <div className="flex gap-2 px-2">
                    <Button
                        onClick={runAudit}
                        disabled={running}
                        className="bg-slate-900 hover:bg-slate-800 text-white min-w-[150px] transition-all duration-200 hover:shadow-md"
                    >
                        {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        {running ? "Running Audit..." : "Run New Audit"}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 animate-toast-in mx-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <p>{error}</p>
                </div>
            )}

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden mx-2 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                        <FileWarning className="h-5 w-5 text-amber-500" />
                        Detected Anomalies
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 mr-2">
                            <Button
                                variant={viewMode === "list" ? "secondary" : "ghost"}
                                size="sm"
                                className={`h-7 text-[10px] ${viewMode === "list" ? "bg-white shadow-sm" : "text-slate-500"}`}
                                onClick={() => setViewMode("list")}
                            >
                                <ListIcon className="h-3 w-3 mr-1" /> List
                            </Button>
                            <Button
                                variant={viewMode === "board" ? "secondary" : "ghost"}
                                size="sm"
                                className={`h-7 text-[10px] ${viewMode === "board" ? "bg-white shadow-sm" : "text-slate-500"}`}
                                onClick={() => setViewMode("board")}
                            >
                                <LayoutGrid className="h-3 w-3 mr-1" /> Board
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            onClick={downloadPDF}
                            disabled={findings.length === 0}
                        >
                            <Download className="h-3 w-3 mr-2" /> Download PDF Report
                        </Button>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                                onClick={() => handleExport("csv")}
                                disabled={findings.length === 0}
                            >
                                <Download className="h-3 w-3 mr-1" /> CSV
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                                onClick={() => handleExport("json")}
                                disabled={findings.length === 0}
                            >
                                <Download className="h-3 w-3 mr-1" /> JSON
                            </Button>
                        </div>
                        <span className="text-sm text-slate-500">{pagination.totalCount} findings</span>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="h-8 px-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                        <option value="">All Types</option>
                        <option value="MISSING_ISWC">Missing ISWC</option>
                        <option value="MISSING_ISRC">Missing ISRC</option>
                        <option value="SPLIT_OVERLAP">Split Overlap</option>
                        <option value="SPLIT_UNDERCLAIM">Split Underclaim</option>
                        <option value="UNLINKED_RECORDING">Unlinked Recording</option>
                        <option value="POSSIBLE_DUPLICATE">Possible Duplicate</option>
                        <option value="BLACK_BOX_REVENUE">Black Box Revenue</option>
                    </select>
                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="h-8 px-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                        <option value="">All Severity</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="h-8 px-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    >
                        <option value="">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="DISPUTED">Disputed</option>
                        <option value="RECOVERED">Recovered</option>
                        <option value="IGNORED">Ignored</option>
                    </select>
                    <div className="flex-1 min-w-[180px] max-w-xs relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                        />
                    </div>
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-slate-500 hover:text-slate-900"
                            onClick={clearFilters}
                        >
                            <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                    )}
                </div>

                {/* Bulk Actions Toolbar */}
                {selected.size > 0 && (
                    <div className="px-6 py-2 border-b border-slate-200 bg-amber-50 flex items-center gap-3 animate-toast-in">
                        <CheckSquare className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-700 font-medium">{selected.size} selected</span>
                        <div className="flex gap-2 ml-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-emerald-600 hover:bg-emerald-100"
                                onClick={() => bulkAction("updateStatus", "RECOVERED")}
                            >
                                <Coins className="h-3 w-3 mr-1" /> Bulk Recover
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-red-600 hover:bg-red-100"
                                onClick={() => bulkAction("updateStatus", "DISPUTED")}
                            >
                                <ShieldAlert className="h-3 w-3 mr-1" /> Bulk Dispute
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-amber-700 hover:bg-amber-100"
                                onClick={() => bulkAction("createTasks")}
                            >
                                <HistoryIcon className="h-3 w-3 mr-1" /> Create Tasks
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-slate-500 hover:bg-slate-200"
                                onClick={() => bulkAction("updateStatus", "IGNORED")}
                            >
                                Ignore
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-slate-500 hover:text-slate-900"
                                onClick={() => setSelected(new Set())}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading findings...</div>
                ) : findings.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center bg-white">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No anomalies detected</h3>
                        <p className="text-slate-500 mt-1 max-w-sm">
                            Your catalog appears healthy, or you haven&apos;t run an audit yet.
                        </p>
                    </div>
                ) : viewMode === "board" ? (
                    <div className="bg-slate-50 p-6">
                        <TaskBoard />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
                                        />
                                    </th>
                                    <th className="px-6 py-3">Severity</th>
                                    <th className="px-6 py-3">Anomaly</th>
                                    <th className="px-6 py-3">Suggested Fix</th>
                                    <th className="px-6 py-3">Confidence</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Est. Leakage</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {findings.map((finding) => (
                                    <tr key={finding.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected.has(finding.id) ? "bg-amber-50/50" : ""}`}>
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(finding.id)}
                                                onChange={() => toggleSelect(finding.id)}
                                                className="rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${finding.severity === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                                                finding.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                {finding.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{finding.type.replace(/_/g, " ")}</span>
                                                <span className="text-[10px] text-slate-500">ID: {finding.resourceId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {finding.metadataFix ? (
                                                <div className="flex flex-col gap-2">
                                                    {JSON.parse(finding.metadataFix).map((fix: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2 group">
                                                            <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] border border-emerald-200 whitespace-nowrap">
                                                                {fix.field.toUpperCase()}: {fix.value}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2 text-[10px] text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
                                                                onClick={() => applyMetadataFix(finding.id, fix)}
                                                                disabled={applyingFixId === `${finding.id}-${fix.field}`}
                                                            >
                                                                {applyingFixId === `${finding.id}-${fix.field}` ? "..." : <Sparkles className="h-3 w-3 mr-1" />}
                                                                Heal
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">Manual review required</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-500 transition-all duration-500"
                                                        style={{ width: `${finding.confidence}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-500">{finding.confidence}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${finding.status === 'RECOVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                finding.status === 'DISPUTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {finding.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-emerald-600 font-medium font-mono">
                                                    ${finding.estimatedImpact ? finding.estimatedImpact.toFixed(2) : "0.00"}
                                                </span>
                                                {finding.recoveredAmount && (
                                                    <span className="text-[10px] text-slate-500">
                                                        Recovered: ${finding.recoveredAmount.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {finding.status === 'OPEN' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Create Task"
                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                                            onClick={() => createTask(finding.id)}
                                                            disabled={creatingTaskId === finding.id}
                                                        >
                                                            <HistoryIcon className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Mark as Disputed"
                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={async () => {
                                                                await updateRecovery(finding.id, "DISPUTED");
                                                                generateDisputeLetter(finding);
                                                            }}
                                                        >
                                                            <ShieldAlert className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Mark as Recovered"
                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                            onClick={() => {
                                                                const amt = prompt("Enter recovered amount:", finding.estimatedImpact?.toString());
                                                                if (amt) updateRecovery(finding.id, "RECOVERED", parseFloat(amt));
                                                            }}
                                                        >
                                                            <Coins className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {finding.status === 'RECOVERED' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Share Success"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                                                        onClick={() => shareRecovery(finding)}
                                                    >
                                                        <Share className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {finding.status !== 'OPEN' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-500 text-xs hover:text-slate-900"
                                                        onClick={() => updateRecovery(finding.id, "OPEN")}
                                                    >
                                                        Reset
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} total)
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.currentPage === 1 || loading}
                                onClick={() => fetchFindings(pagination.currentPage - 1)}
                                className="h-8 text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.currentPage === pagination.totalPages || loading}
                                onClick={() => fetchFindings(pagination.currentPage + 1)}
                                className="h-8 text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
