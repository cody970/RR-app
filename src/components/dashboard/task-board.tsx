"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/lib/finance/currency";
import { Finding } from "@/types";
import { CheckCircle2, CircleDashed, Filter, MoreHorizontal, ShieldAlert, Sparkles } from "lucide-react";

const COLUMNS = [
    { id: "OPEN", label: "Open Issues", icon: CircleDashed, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { id: "DISPUTED", label: "In Dispute", icon: ShieldAlert, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { id: "RECOVERED", label: "Recovered", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { id: "IGNORED", label: "Resolved", icon: Filter, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" }
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
        <div className="flex flex-col items-center justify-center p-24 space-y-6">
            <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin transition-all" />
            <div className="flex flex-col items-center gap-2">
                <p className="text-foreground font-bold tracking-tight text-lg">Synchronizing Workspace</p>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Applying audit intelligence...</p>
            </div>
        </div>
    );

    const getSeverityColor = (sev: string) => {
        switch (sev) {
            case "HIGH": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
            case "MEDIUM": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
            default: return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 min-h-[800px]">
            {COLUMNS.map(col => {
                const colFindings = findings.filter(f => f.status === col.id);
                return (
                    <div key={col.id} className="flex flex-col gap-6">
                        <div className="flex items-center justify-between px-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${col.bg} border ${col.border}`}>
                                    <col.icon className={`h-4 w-4 ${col.color}`} />
                                </div>
                                <h3 className="font-bold text-foreground text-sm tracking-tight">{col.label}</h3>
                            </div>
                            <span className="bg-card/50 text-muted-foreground px-2.5 py-1 rounded-lg text-[10px] border border-border/50 shadow-sm font-black ring-1 ring-black/[0.03]">
                                {colFindings.length}
                            </span>
                        </div>

                        <div className="bg-muted/30 rounded-3xl p-4 border border-border/50 min-h-[700px] flex flex-col gap-4 shadow-inner glass-card backdrop-blur-sm relative overflow-hidden">
                            {/* Ambient background accent per column */}
                            <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] rounded-full pointer-events-none opacity-10 ${col.bg}`} />

                            {colFindings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20 h-full text-muted-foreground">
                                    <col.icon className="h-12 w-12 mb-4" />
                                    <p className="text-[10px] uppercase font-black tracking-[0.2em]">Queue Clear</p>
                                </div>
                            ) : (
                                colFindings.map(finding => (
                                    <Card
                                        key={finding.id}
                                        className="group relative border-border/50 bg-card hover:bg-card/80 border-l-4 hover:shadow-2xl hover:shadow-indigo-500/[0.05] transition-all duration-500 cursor-grab shadow-sm rounded-2xl overflow-hidden"
                                        style={{ borderLeftColor: finding.severity === 'HIGH' ? '#f43f5e' : (finding.severity === 'MEDIUM' ? '#f59e0b' : '#6366f1') }}
                                    >
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wider ${getSeverityColor(finding.severity)}`}>
                                                    {finding.severity}
                                                </span>
                                                <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <CardTitle className="text-[13px] font-bold text-foreground group-hover:text-indigo-600 transition-colors leading-snug tracking-tight">
                                                {finding.type.replace(/_/g, " ")}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-1">
                                            <div className="flex justify-between items-end mb-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Impact Potential</p>
                                                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                                                        {formatCurrency(finding.estimatedImpact || 0, finding.currency)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 group/heal">
                                                    {finding.metadataFix && (
                                                        <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                                                            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">Quick Move</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {COLUMNS.filter(c => c.id !== col.id).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => updateStatus(finding.id, c.id)}
                                                            className="text-[10px] font-bold px-2 py-1.5 rounded-xl bg-muted/50 hover:bg-indigo-500 hover:text-white text-muted-foreground border border-border/50 transition-all duration-300 text-center truncate shadow-sm ring-1 ring-black/[0.02] hover:shadow-indigo-500/20"
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
    );
}
