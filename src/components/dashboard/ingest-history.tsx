"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, ChevronDown, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import React from "react";

interface IngestJob {
    id: string;
    type: string;
    status: string;
    totalRows: number;
    importedRows: number;
    failedRows: number;
    createdAt: string;
    user: { email: string };
    errors?: string;
}

export function IngestHistory({ refreshTrigger }: { refreshTrigger: number }) {
    const [history, setHistory] = useState<IngestJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedJob, setExpandedJob] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/ingest/history");
            if (res.ok) {
                setHistory(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch ingest history:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [refreshTrigger]);

    if (loading) return (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50 animate-pulse">
            <div className="h-4 w-4 rounded-full bg-indigo-500/20" />
            <div className="h-4 w-32 bg-indigo-500/10 rounded" />
        </div>
    );
    if (history.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3 tracking-tight">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Recent Data Ingestion
                </h2>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                    Last 24 Hours
                </div>
            </div>

            <div className="border border-border/50 rounded-2xl bg-card/30 overflow-hidden shadow-xl shadow-black/[0.02] glass-card backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-muted-foreground uppercase bg-muted/40 border-b border-border/50 font-bold tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Source Type</th>
                                <th className="px-6 py-4">Current Status</th>
                                <th className="px-6 py-4">Records Processed</th>
                                <th className="px-6 py-4">Initiated By</th>
                                <th className="px-6 py-4">timestamp</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {history.map((job) => (
                                <React.Fragment key={job.id}>
                                    <tr className="hover:bg-indigo-500/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground text-sm tracking-tight">{job.type}</span>
                                                <span className="text-[10px] text-muted-foreground">ID: {job.id.slice(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {job.status === "COMPLETED" ? (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                                        <CheckCircle2 className="h-3 w-3" /> COMPLETED
                                                    </div>
                                                ) : job.status === "FAILED" ? (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                                        <XCircle className="h-3 w-3" /> FAILED
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                                        <Clock className="h-3 w-3" /> PROCESSING
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-sm font-bold text-foreground font-mono">
                                                    {job.importedRows.toLocaleString()}
                                                </span>
                                                <span className="text-muted-foreground">/</span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {job.totalRows.toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                    {job.user.email[0].toUpperCase()}
                                                </div>
                                                <span className="text-xs text-muted-foreground font-medium">{job.user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-muted-foreground font-medium">
                                            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {job.failedRows > 0 && (
                                                <button
                                                    onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                                                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300
                                                        ${expandedJob === job.id
                                                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                                            : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
                                                >
                                                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedJob === job.id ? "rotate-180" : ""}`} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedJob === job.id && job.errors && (
                                        <tr className="bg-indigo-500/[0.01]">
                                            <td colSpan={6} className="px-6 py-4 border-t border-border/30">
                                                <div className="bg-red-500/[0.02] border border-red-500/10 rounded-xl p-6 space-y-4">
                                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
                                                        <AlertCircle className="h-4 w-4" /> Row Validation Errors
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto pr-4 custom-scrollbar space-y-2">
                                                        {JSON.parse(job.errors).map((err: any, idx: number) => (
                                                            <div key={idx} className="flex gap-4 p-3 rounded-lg bg-card/50 border border-red-500/5 hover:border-red-500/20 transition-colors">
                                                                <span className="text-red-500 font-bold font-mono text-xs whitespace-nowrap">Line {err.row}:</span>
                                                                <span className="text-xs text-muted-foreground leading-relaxed">
                                                                    {Array.isArray(err.errors) ? err.errors.join(", ") : err.errors}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
