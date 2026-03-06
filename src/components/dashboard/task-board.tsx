"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/lib/finance/currency";
import { Finding } from "@/types";
import { AlertTriangle, CheckCircle2, CircleDashed, Filter, MoreHorizontal, ShieldAlert, Sparkles } from "lucide-react";

const COLUMNS = [
    { id: "OPEN", label: "Open Issues", icon: CircleDashed, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
    { id: "DISPUTED", label: "In Dispute", icon: ShieldAlert, color: "text-red-500", bg: "bg-red-100", border: "border-red-200" },
    { id: "RECOVERED", label: "Recovered", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" },
    { id: "IGNORED", label: "Resolved/Archived", icon: Filter, color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200" }
];

export function TaskBoard() {
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchFindings = async () => {
        try {
            const res = await fetch("/api/findings?limit=100");
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setFindings(data.findings);
        } catch (error) {
            toast.error("Failed to load task board");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFindings();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/findings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setFindings(prev =>
                    prev.map(f => f.id === id ? { ...f, status: newStatus as any } : f)
                );
                toast.success(`Moved to ${newStatus}`);
            } else {
                toast.error("Update failed");
            }
        } catch (error) {
            toast.error("Network error updating status");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Synchronizing Workspace...</p>
        </div>
    );

    const getSeverityColor = (sev: string) => {
        switch (sev) {
            case "HIGH": return "bg-red-50 text-red-600 border-red-200";
            case "MEDIUM": return "bg-amber-50 text-amber-600 border-amber-200";
            default: return "bg-blue-50 text-blue-600 border-blue-200";
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[700px]">
            {COLUMNS.map(col => {
                const colFindings = findings.filter(f => f.status === col.id);
                return (
                    <div key={col.id} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2 py-1">
                            <div className="flex items-center gap-2">
                                <col.icon className={`h-4 w-4 ${col.color}`} />
                                <h3 className="font-semibold text-slate-800 text-sm tracking-tight">{col.label}</h3>
                            </div>
                            <span className="bg-white text-slate-500 px-2 py-0.5 rounded text-[10px] border border-slate-200 shadow-sm font-mono">
                                {colFindings.length}
                            </span>
                        </div>

                        <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 min-h-[600px] flex flex-col gap-3 shadow-inner">
                            {colFindings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-40 h-full text-slate-400">
                                    <col.icon className="h-10 w-10 mb-2" />
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Empty Pool</p>
                                </div>
                            ) : (
                                colFindings.map(finding => (
                                    <Card
                                        key={finding.id}
                                        className="group relative border-slate-200 bg-white hover:bg-slate-50 border-l-4 hover:shadow-md transition-all duration-200 cursor-grab shadow-sm"
                                        style={{ borderLeftColor: finding.severity === 'HIGH' ? '#ef4444' : (finding.severity === 'MEDIUM' ? '#f59e0b' : '#3b82f6') }}
                                    >
                                        <CardHeader className="p-3 pb-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getSeverityColor(finding.severity)}`}>
                                                    {finding.severity}
                                                </span>
                                                <button className="text-slate-400 hover:text-slate-700 transition-colors">
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <CardTitle className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors leading-tight">
                                                {finding.type.replace(/_/g, " ")}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-1">
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <p className="text-xs text-slate-500 mb-1">Impact Potential</p>
                                                    <p className="text-sm font-bold text-emerald-600 font-mono">
                                                        {formatCurrency(finding.estimatedImpact || 0, finding.currency)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 group/heal">
                                                    {finding.metadataFix && (
                                                        <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Transition To:</label>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {COLUMNS.filter(c => c.id !== col.id).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => updateStatus(finding.id, c.id)}
                                                            className="text-[9px] px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900 transition-colors text-left truncate shadow-sm"
                                                        >
                                                            {c.label.split(' ')[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
