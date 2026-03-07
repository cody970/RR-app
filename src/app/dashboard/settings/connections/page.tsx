"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
    Mail,
    Plus,
    Trash2,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    Settings2,
    Copy,
    ToggleLeft,
    ToggleRight,
    Loader2,
    Inbox,
    AlertTriangle,
} from "lucide-react";

// ---------- Types ----------

interface IngestionSource {
    id: string;
    name: string;
    type: string;
    ingestEmail: string | null;
    senderFilter: string | null;
    societyHint: string | null;
    enabled: boolean;
    lastReceivedAt: string | null;
    totalImported: number;
    createdAt: string;
}

interface IngestionLog {
    id: string;
    senderEmail: string;
    subject: string | null;
    status: string;
    message: string | null;
    filesProcessed: number;
    createdAt: string;
}

// ---------- Component ----------

export default function ConnectionsPage() {
    const [sources, setSources] = useState<IngestionSource[]>([]);
    const [logs, setLogs] = useState<IngestionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    // Add form state
    const [formName, setFormName] = useState("");
    const [formSociety, setFormSociety] = useState("");
    const [formSenderFilter, setFormSenderFilter] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [sourcesRes, logsRes] = await Promise.all([
                fetch("/api/settings/connections"),
                fetch("/api/settings/connections/logs"),
            ]);

            if (sourcesRes.ok) {
                const data = await sourcesRes.json();
                setSources(data.sources || []);
            }
            if (logsRes.ok) {
                const data = await logsRes.json();
                setLogs(data.logs || []);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load connections");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAdd = async () => {
        if (!formName.trim()) {
            toast.error("Please enter a connection name");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/settings/connections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    societyHint: formSociety || undefined,
                    senderFilter: formSenderFilter || undefined,
                }),
            });

            if (res.ok) {
                toast.success("Ingestion source created!");
                setShowAddForm(false);
                setFormName("");
                setFormSociety("");
                setFormSenderFilter("");
                await fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to create source");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const toggleSource = async (id: string, enabled: boolean) => {
        try {
            const res = await fetch(`/api/settings/connections/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !enabled }),
            });
            if (res.ok) {
                toast.success(enabled ? "Source disabled" : "Source enabled");
                await fetchData();
            }
        } catch (e) {
            toast.error("Failed to update source");
        }
    };

    const deleteSource = async (id: string) => {
        if (!confirm("Delete this ingestion source? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/settings/connections/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Source deleted");
                await fetchData();
            }
        } catch (e) {
            toast.error("Failed to delete source");
        }
    };

    const copyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        toast.success("Email address copied!");
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case "SUCCESS": return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
            case "FAILED": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
            case "SKIPPED": return <Clock className="h-3.5 w-3.5 text-amber-500" />;
            default: return <Clock className="h-3.5 w-3.5 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 px-2">
                        Statement Connections
                    </h1>
                    <p className="text-slate-500 px-2 text-sm">
                        Set up automated ingestion of royalty statements via email forwarding.
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
                    <Button
                        size="sm"
                        onClick={() => setShowAddForm(true)}
                        className="h-9 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Source
                    </Button>
                </div>
            </div>

            {/* How It Works */}
            <div className="mx-2 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    How Email Ingestion Works
                </h3>
                <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                    <li>Create an ingestion source below — you&apos;ll get a unique email address</li>
                    <li>Set up auto-forwarding from your PRO (ASCAP, BMI, etc.) to that address</li>
                    <li>When statements arrive, they&apos;re automatically parsed, imported, and audited</li>
                    <li>Check the activity log below to monitor incoming statements</li>
                </ol>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="mx-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        New Ingestion Source
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Connection Name *
                            </label>
                            <input
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g., ASCAP Statements"
                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Society (optional)
                            </label>
                            <select
                                value={formSociety}
                                onChange={(e) => setFormSociety(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">Auto-detect</option>
                                <option value="ASCAP">ASCAP</option>
                                <option value="BMI">BMI</option>
                                <option value="MLC">The MLC</option>
                                <option value="SOUNDEXCHANGE">SoundExchange</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Allowed Senders (optional)
                            </label>
                            <input
                                type="text"
                                value={formSenderFilter}
                                onChange={(e) => setFormSenderFilter(e.target.value)}
                                placeholder="e.g., statements@ascap.com"
                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddForm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAdd}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {saving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Create Source
                        </Button>
                    </div>
                </div>
            )}

            {/* Sources List */}
            <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-slate-500" />
                        Active Sources
                        <span className="text-xs text-slate-400 font-normal">({sources.length})</span>
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                ) : sources.length === 0 ? (
                    <div className="p-8 text-center">
                        <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No ingestion sources configured yet.</p>
                        <p className="text-slate-400 text-xs mt-1">Click &quot;Add Source&quot; to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sources.map((source) => (
                            <div key={source.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${source.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                                        <h3 className="font-medium text-slate-900 text-sm">{source.name}</h3>
                                        {source.societyHint && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                {source.societyHint}
                                            </span>
                                        )}
                                    </div>
                                    {source.ingestEmail && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <code className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                                                {source.ingestEmail}
                                            </code>
                                            <button
                                                onClick={() => copyEmail(source.ingestEmail!)}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                        <span>{source.totalImported} statements imported</span>
                                        {source.lastReceivedAt && (
                                            <span>Last: {new Date(source.lastReceivedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleSource(source.id, source.enabled)}
                                        className="text-slate-400 hover:text-slate-600"
                                        title={source.enabled ? "Disable" : "Enable"}
                                    >
                                        {source.enabled ? (
                                            <ToggleRight className="h-6 w-6 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="h-6 w-6 text-slate-300" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => deleteSource(source.id)}
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

            {/* Activity Log */}
            <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        Recent Activity
                    </h2>
                </div>

                {logs.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        No ingestion activity yet. Statements will appear here once received.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {logs.slice(0, 20).map((log) => (
                            <div key={log.id} className="px-6 py-3 flex items-center gap-3">
                                {statusIcon(log.status)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-700 truncate">
                                        <span className="font-medium">{log.senderEmail}</span>
                                        {log.subject && <span className="text-slate-400"> — {log.subject}</span>}
                                    </p>
                                    {log.message && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">{log.message}</p>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex-shrink-0">
                                    {new Date(log.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}