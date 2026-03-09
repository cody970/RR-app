"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
    Plug,
    CheckCircle,
    XCircle,
    RefreshCw,
    Loader2,
    Music2,
    Headphones,
    AudioLines,
    Database,
    FileCheck2,
    Fingerprint,
} from "lucide-react";

interface Integration {
    id: string;
    name: string;
    description: string;
    configured: boolean;
    status: "connected" | "not_configured" | "error";
    envVar: string;
}

const ICONS: Record<string, React.ReactNode> = {
    muso: <Music2 className="h-5 w-5 text-violet-500" />,
    spotify: <Headphones className="h-5 w-5 text-green-500" />,
    haawk: <Fingerprint className="h-5 w-5 text-blue-500" />,
    soundexchange: <AudioLines className="h-5 w-5 text-amber-500" />,
    tuneregistry: <FileCheck2 className="h-5 w-5 text-sky-500" />,
    musicbrainz: <Database className="h-5 w-5 text-orange-500" />,
};

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingId, setTestingId] = useState<string | null>(null);
    const toast = useToast();

    const fetchIntegrations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/settings/integrations");
            if (res.ok) {
                const data = await res.json();
                setIntegrations(data.integrations || []);
            }
        } catch {
            toast.error("Failed to load integrations");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    const testConnection = async (id: string) => {
        setTestingId(id);
        try {
            const res = await fetch("/api/settings/integrations/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ integrationId: id }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.message || "Connection test failed");
            }
        } catch {
            toast.error("Failed to test connection");
        } finally {
            setTestingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-4 px-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    <Plug className="h-8 w-8 text-amber-500" />
                    Integrations
                </h1>
                <p className="text-slate-500 mt-1">
                    External API connections used for catalog enrichment, credit verification, and registration.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration) => (
                    <div
                        key={integration.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    {ICONS[integration.id] || <Plug className="h-5 w-5 text-slate-400" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">{integration.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {integration.status === "connected" ? (
                                            <>
                                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                                                <span className="text-[10px] font-medium text-emerald-600">Connected</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3 text-slate-400" />
                                                <span className="text-[10px] font-medium text-slate-400">Not configured</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {integration.configured && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => testConnection(integration.id)}
                                    disabled={testingId === integration.id}
                                    className="h-8 text-xs border-slate-200"
                                >
                                    {testingId === integration.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Test
                                </Button>
                            )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed mb-3">
                            {integration.description}
                        </p>

                        <div className="text-[10px] text-slate-400 font-mono bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            {integration.envVar}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">Configuration:</strong>{" "}
                    External API keys are managed through environment variables for security.
                    Set them in your <code className="text-[10px] bg-slate-200/80 px-1 py-0.5 rounded">.env.local</code> file or
                    your deployment platform&apos;s environment settings.
                </p>
            </div>
        </div>
    );
}
