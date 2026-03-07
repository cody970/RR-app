"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
    Webhook,
    Plus,
    Trash2,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    Copy,
    ToggleLeft,
    ToggleRight,
    Loader2,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Send,
    Eye,
    EyeOff,
    Globe,
} from "lucide-react";

// ---------- Types ----------

interface WebhookData {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    description: string | null;
    failureCount: number;
    lastDeliveredAt: string | null;
    lastFailedAt: string | null;
    lastStatusCode: number | null;
    createdAt: string;
    updatedAt: string;
}

interface DeliveryData {
    id: string;
    event: string;
    statusCode: number | null;
    responseBody: string | null;
    duration: number | null;
    success: boolean;
    attempts: number;
    createdAt: string;
}

// ---------- Constants ----------

const EVENT_TYPES = [
    { value: "*", label: "All Events", description: "Receive all event types" },
    { value: "finding.created", label: "Finding Created", description: "New audit finding discovered" },
    { value: "finding.recovered", label: "Finding Recovered", description: "Revenue successfully recovered" },
    { value: "finding.status_changed", label: "Finding Status Changed", description: "Finding status updated" },
    { value: "statement.imported", label: "Statement Imported", description: "New statement processed" },
    { value: "statement.matched", label: "Statement Matched", description: "Statement lines matched to catalog" },
    { value: "audit.completed", label: "Audit Completed", description: "Full audit run finished" },
    { value: "scan.completed", label: "Scan Completed", description: "Catalog scan finished" },
    { value: "registration.status_changed", label: "Registration Updated", description: "Registration status changed" },
    { value: "enrichment.completed", label: "Enrichment Completed", description: "Metadata enrichment finished" },
    { value: "payout.issued", label: "Payout Issued", description: "Payout processed" },
    { value: "catalog.updated", label: "Catalog Updated", description: "Catalog data changed" },
];

// ---------- Component ----------

export default function WebhooksPage() {
    const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deliveries, setDeliveries] = useState<Record<string, DeliveryData[]>>({});
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const toast = useToast();

    // Add form state
    const [formUrl, setFormUrl] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formEvents, setFormEvents] = useState<string[]>(["*"]);

    const fetchWebhooks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/webhooks");
            if (res.ok) {
                const data = await res.json();
                setWebhooks(data.webhooks || []);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load webhooks");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWebhooks();
    }, [fetchWebhooks]);

    const fetchDeliveries = async (webhookId: string) => {
        try {
            const res = await fetch(`/api/webhooks/${webhookId}/deliveries?limit=10`);
            if (res.ok) {
                const data = await res.json();
                setDeliveries((prev) => ({ ...prev, [webhookId]: data.deliveries || [] }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleExpanded = (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            if (!deliveries[id]) {
                fetchDeliveries(id);
            }
        }
    };

    const handleAdd = async () => {
        if (!formUrl.trim()) {
            toast.error("Please enter a webhook URL");
            return;
        }
        if (formEvents.length === 0) {
            toast.error("Please select at least one event type");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: formUrl,
                    events: formEvents,
                    description: formDescription || undefined,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setNewSecret(data.secret);
                setShowSecret(true);
                toast.success("Webhook created! Save the signing secret — it won't be shown again.");
                setShowAddForm(false);
                setFormUrl("");
                setFormDescription("");
                setFormEvents(["*"]);
                await fetchWebhooks();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to create webhook");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const toggleWebhook = async (id: string, enabled: boolean) => {
        try {
            const res = await fetch(`/api/webhooks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !enabled }),
            });
            if (res.ok) {
                toast.success(enabled ? "Webhook disabled" : "Webhook enabled");
                await fetchWebhooks();
            }
        } catch (e) {
            toast.error("Failed to update webhook");
        }
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm("Delete this webhook? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Webhook deleted");
                if (expandedId === id) setExpandedId(null);
                await fetchWebhooks();
            }
        } catch (e) {
            toast.error("Failed to delete webhook");
        }
    };

    const testWebhook = async (id: string) => {
        setTestingId(id);
        try {
            const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Test delivery successful! HTTP ${data.delivery?.statusCode || "OK"}`);
                // Refresh deliveries if expanded
                if (expandedId === id) {
                    await fetchDeliveries(id);
                }
            } else if (res.ok && !data.success) {
                toast.error(`Test delivery failed: HTTP ${data.delivery?.statusCode || "unknown"}`);
                if (expandedId === id) {
                    await fetchDeliveries(id);
                }
            } else {
                toast.error(data.error || "Failed to send test");
            }
        } catch (e) {
            toast.error("Network error sending test");
        } finally {
            setTestingId(null);
        }
    };

    const toggleEvent = (event: string) => {
        if (event === "*") {
            setFormEvents(formEvents.includes("*") ? [] : ["*"]);
            return;
        }
        // If selecting a specific event, remove wildcard
        let next = formEvents.filter((e) => e !== "*");
        if (next.includes(event)) {
            next = next.filter((e) => e !== event);
        } else {
            next.push(event);
        }
        setFormEvents(next);
    };

    const copySecret = () => {
        if (newSecret) {
            navigator.clipboard.writeText(newSecret);
            toast.success("Secret copied to clipboard!");
        }
    };

    const statusBadge = (wh: WebhookData) => {
        if (!wh.enabled) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Disabled</span>;
        if (wh.failureCount >= 5) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Failing</span>;
        if (wh.lastDeliveredAt) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Active</span>;
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 px-2">
                        Webhooks
                    </h1>
                    <p className="text-slate-500 px-2 text-sm">
                        Get real-time notifications when events happen in your account.
                    </p>
                </div>
                <div className="flex gap-2 px-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchWebhooks}
                        disabled={loading}
                        className="h-9"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => { setShowAddForm(true); setNewSecret(null); }}
                        className="h-9 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Webhook
                    </Button>
                </div>
            </div>

            {/* Secret Display (shown after creation) */}
            {newSecret && (
                <div className="mx-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Save Your Signing Secret
                    </h3>
                    <p className="text-xs text-amber-700 mb-3">
                        This secret is used to verify webhook payloads. It will only be shown once.
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-amber-300 font-mono break-all">
                            {showSecret ? newSecret : "•".repeat(48)}
                        </code>
                        <button
                            onClick={() => setShowSecret(!showSecret)}
                            className="text-amber-600 hover:text-amber-800 p-1"
                        >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={copySecret}
                            className="text-amber-600 hover:text-amber-800 p-1"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setNewSecret(null)}
                        className="mt-3 text-xs text-amber-600 hover:text-amber-800 underline"
                    >
                        I&apos;ve saved the secret — dismiss
                    </button>
                </div>
            )}

            {/* Add Form */}
            {showAddForm && (
                <div className="mx-2 p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        New Webhook Endpoint
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Payload URL *
                            </label>
                            <input
                                type="url"
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                placeholder="https://example.com/webhooks/royaltyradar"
                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Description (optional)
                            </label>
                            <input
                                type="text"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="e.g., Production Slack notifications"
                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-2">
                                Events to Subscribe
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {EVENT_TYPES.map((evt) => (
                                    <label
                                        key={evt.value}
                                        className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                            formEvents.includes(evt.value)
                                                ? "border-indigo-300 bg-indigo-50"
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formEvents.includes(evt.value)}
                                            onChange={() => toggleEvent(evt.value)}
                                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <span className="text-xs font-medium text-slate-900">
                                                {evt.label}
                                            </span>
                                            <p className="text-[10px] text-slate-500">{evt.description}</p>
                                        </div>
                                    </label>
                                ))}
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
                            Create Webhook
                        </Button>
                    </div>
                </div>
            )}

            {/* Webhooks List */}
            <div className="mx-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Webhook className="h-4 w-4 text-slate-500" />
                        Endpoints
                        <span className="text-xs text-slate-400 font-normal">({webhooks.length})</span>
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                ) : webhooks.length === 0 ? (
                    <div className="p-8 text-center">
                        <Send className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No webhooks configured yet.</p>
                        <p className="text-slate-400 text-xs mt-1">
                            Click &quot;Add Webhook&quot; to start receiving real-time event notifications.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {webhooks.map((wh) => (
                            <div key={wh.id}>
                                {/* Webhook Row */}
                                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                wh.enabled
                                                    ? wh.failureCount >= 5
                                                        ? "bg-red-500"
                                                        : "bg-emerald-500"
                                                    : "bg-slate-300"
                                            }`} />
                                            <code className="text-xs text-slate-700 font-mono truncate max-w-[300px]">
                                                {wh.url}
                                            </code>
                                            {statusBadge(wh)}
                                        </div>
                                        {wh.description && (
                                            <p className="text-xs text-slate-500 mt-1 ml-4">{wh.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5 ml-4 text-[10px] text-slate-400 flex-wrap">
                                            <span>{wh.events.includes("*") ? "All events" : `${wh.events.length} event${wh.events.length !== 1 ? "s" : ""}`}</span>
                                            {wh.lastDeliveredAt && (
                                                <span>Last delivery: {new Date(wh.lastDeliveredAt).toLocaleDateString()}</span>
                                            )}
                                            {wh.lastStatusCode && (
                                                <span className={wh.lastStatusCode < 400 ? "text-emerald-500" : "text-red-500"}>
                                                    HTTP {wh.lastStatusCode}
                                                </span>
                                            )}
                                            {wh.failureCount > 0 && (
                                                <span className="text-amber-500">{wh.failureCount} consecutive failures</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => toggleExpanded(wh.id)}
                                            className="text-slate-400 hover:text-slate-600 p-1"
                                            title="View deliveries"
                                        >
                                            {expandedId === wh.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => testWebhook(wh.id)}
                                            disabled={testingId === wh.id || !wh.enabled}
                                            className={`p-1 ${
                                                wh.enabled
                                                    ? "text-slate-400 hover:text-blue-500"
                                                    : "text-slate-200 cursor-not-allowed"
                                            }`}
                                            title={wh.enabled ? "Send test event" : "Enable webhook to test"}
                                        >
                                            {testingId === wh.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => toggleWebhook(wh.id, wh.enabled)}
                                            className="text-slate-400 hover:text-slate-600"
                                            title={wh.enabled ? "Disable" : "Enable"}
                                        >
                                            {wh.enabled ? (
                                                <ToggleRight className="h-6 w-6 text-emerald-500" />
                                            ) : (
                                                <ToggleLeft className="h-6 w-6 text-slate-300" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteWebhook(wh.id)}
                                            className="text-slate-400 hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Delivery History (expanded) */}
                                {expandedId === wh.id && (
                                    <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
                                        <h4 className="text-xs font-semibold text-slate-700 py-3">
                                            Recent Deliveries
                                        </h4>
                                        {!deliveries[wh.id] ? (
                                            <p className="text-xs text-slate-400 py-2">Loading...</p>
                                        ) : deliveries[wh.id].length === 0 ? (
                                            <p className="text-xs text-slate-400 py-2">No deliveries yet.</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {deliveries[wh.id].map((d) => (
                                                    <div
                                                        key={d.id}
                                                        className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-slate-100"
                                                    >
                                                        {d.success ? (
                                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                                        ) : (
                                                            <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs font-medium text-slate-700">
                                                                {d.event}
                                                            </span>
                                                            {d.statusCode && (
                                                                <span className={`ml-2 text-[10px] ${
                                                                    d.statusCode < 400 ? "text-emerald-600" : "text-red-600"
                                                                }`}>
                                                                    HTTP {d.statusCode}
                                                                </span>
                                                            )}
                                                            {d.duration !== null && (
                                                                <span className="ml-2 text-[10px] text-slate-400">
                                                                    {d.duration}ms
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                                                            {new Date(d.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Documentation */}
            <div className="mx-2 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Webhook Verification
                </h3>
                <div className="text-xs text-indigo-700 space-y-2">
                    <p>
                        Each webhook delivery includes an <code className="bg-white px-1 py-0.5 rounded text-indigo-800">X-RoyaltyRadar-Signature</code> header
                        containing an HMAC-SHA256 signature of the payload.
                    </p>
                    <p>Verify it in your server:</p>
                    <pre className="bg-white p-3 rounded-lg text-[11px] overflow-x-auto border border-indigo-200">
{`const crypto = require('crypto');
const signature = req.headers['x-royaltyradar-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
const valid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expected)
);`}
                    </pre>
                </div>
            </div>
        </div>
    );
}