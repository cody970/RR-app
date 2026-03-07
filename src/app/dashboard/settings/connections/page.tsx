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
    Server,
    Globe,
    Play,
} from "lucide-react";

// ---------- Types ----------

interface IngestionSource {
    id: string;
    name: string;
    type: string;
    ingestEmail: string | null;
    senderFilter: string | null;
    societyHint: string | null;
    sftpHost: string | null;
    sftpPort: number | null;
    sftpUsername: string | null;
    sftpPath: string | null;
    apiEndpoint: string | null;
    schedule: string | null;
    enabled: boolean;
    lastReceivedAt: string | null;
    lastSyncAt: string | null;
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

type SourceType = "EMAIL" | "SFTP" | "API";

// ---------- Component ----------

export default function ConnectionsPage() {
    const [sources, setSources] = useState<IngestionSource[]>([]);
    const [logs, setLogs] = useState<IngestionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fetching, setFetching] = useState<string | null>(null);
    const toast = useToast();

    // Add form state
    const [formType, setFormType] = useState<SourceType>("EMAIL");
    const [formName, setFormName] = useState("");
    const [formSociety, setFormSociety] = useState("");
    const [formSenderFilter, setFormSenderFilter] = useState("");
    // SFTP fields
    const [formSftpHost, setFormSftpHost] = useState("");
    const [formSftpPort, setFormSftpPort] = useState("22");
    const [formSftpUsername, setFormSftpUsername] = useState("");
    const [formSftpPath, setFormSftpPath] = useState("/");
    // Schedule field
    const [formSchedule, setFormSchedule] = useState("");

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
        } catch (err) {
            console.error(err);
            toast.error("Failed to load connections");
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAdd = async () => {
        if (!formName.trim()) {
            toast.error("Please enter a connection name");
            return;
        }

        // Validate SFTP fields if SFTP type selected
        if (formType === "SFTP" && !formSftpHost.trim()) {
            toast.error("Please enter an SFTP host");
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: formName,
                type: formType,
                societyHint: formSociety || undefined,
            };

            if (formType === "EMAIL") {
                payload.senderFilter = formSenderFilter || undefined;
            } else if (formType === "SFTP") {
                payload.sftpHost = formSftpHost;
                payload.sftpPort = parseInt(formSftpPort) || 22;
                payload.sftpUsername = formSftpUsername || undefined;
                payload.sftpPath = formSftpPath || "/";
                payload.schedule = formSchedule || undefined;
            } else if (formType === "API") {
                payload.schedule = formSchedule || undefined;
            }

            const res = await fetch("/api/settings/connections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success("Ingestion source created!");
                setShowAddForm(false);
                resetForm();
                await fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to create source");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormType("EMAIL");
        setFormName("");
        setFormSociety("");
        setFormSenderFilter("");
        setFormSftpHost("");
        setFormSftpPort("22");
        setFormSftpUsername("");
        setFormSftpPath("/");
        setFormSchedule("");
    };

    const triggerFetch = async (id: string) => {
        setFetching(id);
        try {
            const res = await fetch(`/api/settings/connections/${id}/fetch`, {
                method: "POST",
            });
            if (res.ok) {
                toast.success("Fetch job triggered! Check activity log for results.");
                await fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to trigger fetch");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setFetching(null);
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
        } catch {
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
        } catch {
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

    const typeIcon = (type: string) => {
        switch (type) {
            case "EMAIL": return <Mail className="h-4 w-4" />;
            case "SFTP": return <Server className="h-4 w-4" />;
            case "API": return <Globe className="h-4 w-4" />;
            default: return <Settings2 className="h-4 w-4" />;
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
                        Set up automated ingestion of royalty statements via email, SFTP, or API.
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
                    <Settings2 className="h-4 w-4" />
                    Automated Statement Ingestion
                </h3>
                <div className="text-xs text-indigo-700 space-y-2">
                    <p className="font-medium">Choose from three ingestion methods:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                        <li><strong>Email:</strong> Forward statement emails to a unique address</li>
                        <li><strong>SFTP:</strong> Automatically fetch from society SFTP servers on schedule</li>
                        <li><strong>API:</strong> Pull data directly from MLC/SoundExchange APIs</li>
                    </ul>
                    <p className="text-indigo-600 mt-2">All sources auto-parse, import, and run discrepancy checks.</p>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="mx-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        New Ingestion Source
                    </h3>

                    {/* Source Type Selection */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-700 mb-2">
                            Source Type *
                        </label>
                        <div className="flex gap-2">
                            {(["EMAIL", "SFTP", "API"] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFormType(type)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                                        formType === type
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                                    }`}
                                >
                                    {typeIcon(type)}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

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
                                Society {formType === "API" ? "*" : "(optional)"}
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

                        {/* Email-specific fields */}
                        {formType === "EMAIL" && (
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
                        )}

                        {/* SFTP-specific fields */}
                        {formType === "SFTP" && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        SFTP Host *
                                    </label>
                                    <input
                                        type="text"
                                        value={formSftpHost}
                                        onChange={(e) => setFormSftpHost(e.target.value)}
                                        placeholder="sftp.society.com"
                                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Port
                                    </label>
                                    <input
                                        type="number"
                                        value={formSftpPort}
                                        onChange={(e) => setFormSftpPort(e.target.value)}
                                        placeholder="22"
                                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={formSftpUsername}
                                        onChange={(e) => setFormSftpUsername(e.target.value)}
                                        placeholder="username"
                                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Remote Path
                                    </label>
                                    <input
                                        type="text"
                                        value={formSftpPath}
                                        onChange={(e) => setFormSftpPath(e.target.value)}
                                        placeholder="/statements"
                                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Schedule field for SFTP/API */}
                        {(formType === "SFTP" || formType === "API") && (
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Schedule (cron)
                                </label>
                                <input
                                    type="text"
                                    value={formSchedule}
                                    onChange={(e) => setFormSchedule(e.target.value)}
                                    placeholder="0 0 * * * (daily at midnight, 5-field cron)"
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Standard 5-field cron: minute hour day month weekday
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowAddForm(false); resetForm(); }}
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
                                        <span className="text-slate-400">{typeIcon(source.type)}</span>
                                        <h3 className="font-medium text-slate-900 text-sm">{source.name}</h3>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                                            {source.type}
                                        </span>
                                        {source.societyHint && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                                                {source.societyHint}
                                            </span>
                                        )}
                                    </div>
                                    {/* Email address for EMAIL type */}
                                    {source.type === "EMAIL" && source.ingestEmail && (
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
                                    {/* SFTP details */}
                                    {source.type === "SFTP" && source.sftpHost && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            {source.sftpUsername ? `${source.sftpUsername}@` : ""}{source.sftpHost}:{source.sftpPort || 22}{source.sftpPath}
                                        </div>
                                    )}
                                    {/* Schedule info */}
                                    {source.schedule && (
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            Schedule: <code className="bg-slate-100 px-1 rounded">{source.schedule}</code>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                        <span>{source.totalImported} statements imported</span>
                                        {source.lastReceivedAt && (
                                            <span>Last import: {new Date(source.lastReceivedAt).toLocaleDateString()}</span>
                                        )}
                                        {source.lastSyncAt && (
                                            <span>Last sync: {new Date(source.lastSyncAt).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Manual fetch button for SFTP/API types */}
                                    {(source.type === "SFTP" || source.type === "API") && (
                                        <button
                                            onClick={() => triggerFetch(source.id)}
                                            disabled={fetching === source.id}
                                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-50"
                                            title="Trigger fetch now"
                                        >
                                            {fetching === source.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
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