"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import {
    Settings,
    Globe,
    Key,
    Plus,
    BookOpen,
    Check,
    AlertCircle,
    ShieldIcon,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SettingsPage() {
    const [currency, setCurrency] = useState("USD");
    const [loading, setLoading] = useState(false);
    const [apiKeys, setApiKeys] = useState<{ id: string; key: string; name: string; createdAt: string }[]>([]);
    const toast = useToast();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const res = await fetch("/api/settings");
        if (res.ok) {
            const data = await res.json();
            setCurrency(data.currency);
            setApiKeys(data.apiKeys || []);
        }
    };

    const updateCurrency = async (newCurrency: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currency: newCurrency }),
            });
            if (res.ok) {
                setCurrency(newCurrency);
                toast.success(`Currency updated to ${newCurrency}`);
            } else {
                toast.error("Failed to update currency preference");
            }
        } catch (e) {
            toast.error("Network error updating settings");
        } finally {
            setLoading(false);
        }
    };

    const generateApiKey = async () => {
        const name = prompt("Enter a label for this API Key (e.g., 'Automation Server'):");
        if (!name) return;

        const res = await fetch("/api/settings/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });

        if (res.ok) {
            const newKey = await res.json();
            setApiKeys([...apiKeys, newKey]);
            toast.success("Public access key generated");
            alert(`YOUR NEW SECRET KEY:\n${newKey.key}\n\nPlease copy this immediately. You will never see it again for security reasons.`);
        } else {
            toast.error("Maximum API keys reached for your plan");
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-4 px-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500" />
                        Settings
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage your organization's global preferences and external integrations.</p>
                </div>
                <Link href="/dashboard/settings/api-docs" className="self-start sm:self-auto">
                    <Button variant="outline" className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm">
                        <BookOpen className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">API Documentation</span>
                        <ArrowRight className="h-3 w-3 ml-1 sm:ml-2 opacity-50" />
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Localization Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-slate-700 font-semibold uppercase text-xs tracking-widest">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            Localization
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-tight">Reporting Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => updateCurrency(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all cursor-pointer font-medium shadow-sm"
                                >
                                    {SUPPORTED_CURRENCIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex gap-3">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                    Switching your currency will recalculate all leakage metrics using historical and live exchange rates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* API Keys Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2 text-slate-700 font-semibold uppercase text-xs tracking-widest">
                                <Key className="h-4 w-4 text-amber-500" />
                                Public API Surfaces
                            </div>
                            <Button
                                onClick={generateApiKey}
                                size="sm"
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 transition-all shadow-md shadow-slate-900/10 hover:scale-[1.05]"
                            >
                                <Plus className="h-3 w-3 mr-1" /> Create Secret Key
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {apiKeys.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <ShieldIcon className="h-10 w-10 text-slate-400 mb-4" />
                                    <p className="text-slate-600 font-medium">No external keys configured</p>
                                    <p className="text-slate-500 text-[11px] mt-1 max-w-[200px]">Generate a key to connect your statement importers or royalty tools.</p>
                                </div>
                            ) : (
                                apiKeys.map((key) => (
                                    <div
                                        key={key.id}
                                        className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-400/50 hover:bg-slate-50 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                                                <Key className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">{key.name}</h4>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    ID: <span className="text-slate-600">{key.id}</span> • Issued {new Date(key.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-mono select-none tracking-widest shadow-inner">
                                                •••• •••• ••••
                                            </div>
                                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="API Key Active" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span className="text-[11px] text-slate-500 font-medium">SHA-256 Key Encryption</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span className="text-[11px] text-slate-500 font-medium">Auto-Revocation Security</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
