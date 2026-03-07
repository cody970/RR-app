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

    if (loading) return <div className="text-slate-500 text-sm animate-pulse">Loading import history...</div>;
    if (history.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Recent Imports
            </h2>

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Success / Total</th>
                            <th className="px-6 py-3">Uploaded By</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.map((job) => (
                            <React.Fragment key={job.id}>
                                <tr className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-800">{job.type}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {job.status === "COMPLETED" ? (
                                                <span className="flex items-center gap-1 text-emerald-600 text-xs">
                                                    <CheckCircle2 className="h-3 w-3" /> Success
                                                </span>
                                            ) : job.status === "FAILED" ? (
                                                <span className="flex items-center gap-1 text-red-600 text-xs">
                                                    <XCircle className="h-3 w-3" /> Failed
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-amber-600 text-xs animate-pulse">
                                                    <Clock className="h-3 w-3" /> Processing
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                        <span className={job.failedRows > 0 ? "text-amber-600" : "text-emerald-600"}>
                                            {job.importedRows}
                                        </span> / {job.totalRows}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{job.user.email}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {job.failedRows > 0 && (
                                            <button
                                                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                                                className="text-slate-400 hover:text-slate-800 transition-colors p-1"
                                            >
                                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedJob === job.id ? "rotate-180" : ""}`} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {expandedJob === job.id && job.errors && (
                                    <tr className="bg-slate-50/50">
                                        <td colSpan={6} className="px-6 py-4 border-t border-slate-100">
                                            <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-2">
                                                <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-2">
                                                    <AlertCircle className="h-3 w-3" /> Row Errors
                                                </div>
                                                <div className="max-h-40 overflow-y-auto font-mono text-[10px] text-red-800 space-y-1">
                                                    {JSON.parse(job.errors).map((err: any, idx: number) => (
                                                        <div key={idx} className="flex gap-2 border-b border-red-100/50 pb-1">
                                                            <span className="text-red-500 transition-colors">Row {err.row}:</span>
                                                            <span>{Array.isArray(err.errors) ? err.errors.join(", ") : err.errors}</span>
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
    );
}
