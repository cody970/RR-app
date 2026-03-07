"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
    Calendar,
    Plus,
    Trash2,
    RefreshCw,
    Clock,
    FileText,
    FileSpreadsheet,
    FileJson,
    ToggleLeft,
    ToggleRight,
    Loader2,
    Mail,
    Download,
    ChevronDown,
    ChevronUp,
    Play,
} from "lucide-react";

// ---------- Types ----------

interface ScheduledReport {
    id: string;
    name: string;
    type: string;
    format: string;
    schedule: string;
    recipients: string[];
    filters: string | null;
    enabled: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
    runCount: number;
    createdAt: string;
}

// ---------- Constants ----------

const REPORT_TYPES = [
    { value: "AUDIT_SUMMARY", label: "Audit Summary", icon: "🔍" },
    { value: "REVENUE_BREAKDOWN", label: "Revenue Breakdown", icon: "💰" },
    { value: "CATALOG_HEALTH", label: "Catalog Health", icon: "❤️" },
    { value: "RECOVERY_PROGRESS", label: "Recovery Progress", icon: "📈" },
    { value: "CUSTOM", label: "Custom (All Sections)", icon: "⚙️" },
];

const SCHEDULES = [
    { value: "DAILY", label: "Daily", desc: "Every day at 6:00 AM UTC" },
    { value: "WEEKLY", label: "Weekly", desc: "Every Monday at 6:00 AM UTC" },
    { value: "MONTHLY", label: "Monthly", desc: "1st of each month" },
    { value: "QUARTERLY", label: "Quarterly", desc: "Start of each quarter" },
];

const FORMATS = [
    { value: "PDF", label: "PDF", icon: FileText },
    { value: "CSV", label: "CSV", icon: FileSpreadsheet },
    { value: "JSON", label: "JSON", icon: FileJson },
];

// ---------- Component ----------

export default function ScheduledReportsPage() {
    const [reports, setReports] = useState<ScheduledReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState<string | null>(null);
    const toast = useToast();

    // Form state
    const [formName, setFormName] = useState("");
    const [formType, setFormType] = useState("AUDIT_SUMMARY");
    const [formFormat, setFormFormat] = useState("PDF");
    const [formSchedule, setFormSchedule] = useState("WEEKLY");
    const [formRecipients, setFormRecipients] = useState("");

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/reports/scheduled");
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load scheduled reports");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleAdd = async () => {
        if (!formName.trim()) {
            toast.error("Please enter a report name");
            return;
        }

        const recipients = formRecipients
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);

        if (recipients.length === 0) {
            toast.error("Please enter at least one recipient email");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/reports/scheduled", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    type: formType,
                    format: formFormat,
                    schedule: formSchedule,
                    recipients,
                }),
            });

            if (res.ok) {
                toast.success("Scheduled report created!");
                setShowAddForm(false);
                setFormName("");
                setFormRecipients("");
                await fetchReports();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to create report");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const toggleReport = async (id: string, enabled: boolean) => {
        try {
            const res = await fetch(`/api/reports/scheduled/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !enabled }),
            });
            if (res.ok) {
                toast.success(enabled ? "Report paused" : "Report resumed");
                await fetchReports();
            }
        } catch (e) {
            toast.error("Failed to update report");
        }
    };

    const deleteReport = async (id: string) => {
        if (!confirm("Delete this scheduled report?")) return;
        try {
            const res = await fetch(`/api/reports/scheduled/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Report deleted");
                await fetchReports();
            }
        } catch (e) {
            toast.error("Failed to delete report");
        }
    };

    const generateNow = async (report: ScheduledReport) => {
        setGenerating(report.id);
        try {
            const res = await fetch("/api/reports/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: report.type,
                    format: report.format === "PDF" ? "JSON" : report.format,
                }),
            });

            if (res.ok) {
                if (report.format === "CSV") {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${report.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    const data = await res.json();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${report.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                toast.success("Report generated and downloaded!");
            } else {
                toast.error("Failed to generate report");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setGenerating(null);
        }
    };

    const formatIcon = (format: string) => {
        switch (format) {
            case "PDF": return <FileText className="h-3.5 w-3.5 text-red-500" />;
            case "CSV": return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />;
            case "JSON": return <FileJson className="h-3.5 w-3.5 text-blue-500" />;
            default: return <FileText className="h-3.5 w-3.5 text-slate-400" />;
        }
    };

    const typeLabel = (type: string) => {
        return REPORT_TYPES.find((t) => t.value === type)?.label || type;
    };

    const scheduleLabel = (schedule: string) => {
        return SCHEDULES.find((s) => s.value === schedule)?.label || schedule;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 px-2">
                        Scheduled Reports
                    </h1>
                    <p className="text-slate-500 px-2 text-sm">
                        Automate report generation and delivery to your team.
                    </p>
                </div>
                <div className="flex gap-2 px-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchReports}
                        disabled={loading}
                        className="h-9"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowAddForm(true)}
                        className="h-9 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Schedule
                    </Button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="mx-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        New Scheduled Report
                    </h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Report Name *
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g., Weekly Audit Summary"
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Recipients (comma-separated) *
                                </label>
                                <input
                                    type="text"
                                    value={formRecipients}
                                    onChange={(e) => setFormRecipients(e.target.value)}
                                    placeholder="team@example.com, manager@example.com"
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Report Type
                                </label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    {REPORT_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.icon} {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Schedule
                                </label>
                                <select
                                    value={formSchedule}
                                    onChange={(e) => setFormSchedule(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    {SCHEDULES.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label} — {s.desc}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Format
                                </label>
                                <div className="flex gap-2">
                                    {FORMATS.map((f) => (
                                        <button
                                            key={f.value}
                                            onClick={() => setFormFormat(f.value)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-medium transition-colors ${
                                                formFormat === f.value
                                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            <f.icon className="h-3.5 w-3.5" />
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAdd}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {saving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Create Schedule
                        </Button>
                    </div>
                </div>
            )}

            {/* Reports List */}
            <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        Active Schedules
                        <span className="text-xs text-slate-400 font-normal">({reports.length})</span>
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                ) : reports.length === 0 ? (
                    <div className="p-8 text-center">
                        <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No scheduled reports yet.</p>
                        <p className="text-slate-400 text-xs mt-1">
                            Click &quot;New Schedule&quot; to automate report delivery.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {reports.map((report) => (
                            <div key={report.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${report.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                                        <h3 className="font-medium text-slate-900 text-sm">{report.name}</h3>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {typeLabel(report.type)}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {formatIcon(report.format)}
                                            {report.format}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {scheduleLabel(report.schedule)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {report.recipients.length} recipient{report.recipients.length !== 1 ? "s" : ""}
                                        </span>
                                        {report.runCount > 0 && (
                                            <span>{report.runCount} runs</span>
                                        )}
                                        {report.nextRunAt && report.enabled && (
                                            <span>Next: {new Date(report.nextRunAt).toLocaleDateString()}</span>
                                        )}
                                        {report.lastRunAt && (
                                            <span>Last: {new Date(report.lastRunAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    <div className="mt-1 text-[10px] text-slate-400">
                                        {report.recipients.join(", ")}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => generateNow(report)}
                                        disabled={generating === report.id}
                                        className="text-slate-400 hover:text-indigo-600 p-1"
                                        title="Generate now"
                                    >
                                        {generating === report.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => toggleReport(report.id, report.enabled)}
                                        className="text-slate-400 hover:text-slate-600"
                                        title={report.enabled ? "Pause" : "Resume"}
                                    >
                                        {report.enabled ? (
                                            <ToggleRight className="h-6 w-6 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="h-6 w-6 text-slate-300" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => deleteReport(report.id)}
                                        className="text-slate-400 hover:text-red-500"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}