"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Upload, Plus, FileText, Clock, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import RegisterWizard from "@/components/dashboard/register-wizard";

interface Registration {
    id: string;
    workId: string;
    society: string;
    status: string;
    totalSplitRegistered: number;
    submissionId?: string | null;
    confirmationId?: string | null;
    submittedAt?: string | null;
    acknowledgedAt?: string | null;
    submittedVia?: string | null;
    errors?: string | null;
    work: { title: string; iswc: string | null };
}

interface Work {
    id: string;
    title: string;
    iswc: string | null;
    writers?: { writer: { name: string } }[];
}

interface Batch {
    id: string;
    status: string;
    totalWorks: number;
    submitted: number;
    accepted: number;
    rejected: number;
    societies: string[];
    submittedVia: string;
    createdAt: string;
}

interface Props {
    registrations: Registration[];
    works: Work[];
    batches: Batch[];
    totalRegistered: number;
    totalPending: number;
    totalGenerated: number;
    bySociety: Record<string, number>;
}

export default function RegistrationsClient({
    registrations,
    works,
    batches,
    totalRegistered,
    totalPending,
    totalGenerated,
    bySociety,
}: Props) {
    const [wizardOpen, setWizardOpen] = useState(false);
    const [filter, setFilter] = useState<string>("ALL");

    const filtered = filter === "ALL"
        ? registrations
        : registrations.filter(r => r.society === filter);

    const societies = [...new Set(registrations.map(r => r.society))];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "REGISTERED":
            case "ACCEPTED":
            case "COMPLETE":
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Registered</Badge>;
            case "SUBMITTED":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Submitted</Badge>;
            case "PENDING":
                return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 border">Pending</Badge>;
            case "CWR_GENERATED":
                return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">CWR Ready</Badge>;
            case "REJECTED":
            case "ERROR":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
            default:
                return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 border">{status}</Badge>;
        }
    };

    const getMethodBadge = (method: string | null | undefined) => {
        if (!method) return null;
        switch (method) {
            case "TUNEREGISTRY":
                return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">API</Badge>;
            case "CWR_UPLOAD":
                return <Badge variant="outline" className="text-xs bg-violet-50 text-violet-600 border-violet-200">CWR</Badge>;
            case "MANUAL":
                return <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">Manual</Badge>;
            default:
                return null;
        }
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Registrations</h2>
                        <p className="text-slate-500">Register and track your works across PROs, MLC, HFA & SoundExchange</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-slate-200">
                            <Upload className="w-4 h-4 mr-2" />
                            Import CWR
                        </Button>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white border-0" onClick={() => setWizardOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Register Works
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{totalRegistered}</p>
                                    <p className="text-xs text-slate-500">Registered</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{totalPending}</p>
                                    <p className="text-xs text-slate-500">Pending</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{totalGenerated}</p>
                                    <p className="text-xs text-slate-500">CWR Generated</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{Object.keys(bySociety).length}</p>
                                    <p className="text-xs text-slate-500">Societies</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Society breakdown pills */}
                {Object.keys(bySociety).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter("ALL")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${filter === "ALL"
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                }`}
                        >
                            All ({registrations.length})
                        </button>
                        {societies.map(s => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${filter === s
                                        ? "bg-amber-500 text-white border-amber-500"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    }`}
                            >
                                {s} ({bySociety[s]})
                            </button>
                        ))}
                    </div>
                )}

                {/* Registrations Table */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle>All Registrations</CardTitle>
                        <CardDescription>Track status of your works across Performing Rights Organizations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Work Title</th>
                                        <th className="px-4 py-3 font-medium">ISWC</th>
                                        <th className="px-4 py-3 font-medium">Society</th>
                                        <th className="px-4 py-3 font-medium">Split</th>
                                        <th className="px-4 py-3 font-medium">Method</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-8 h-8 text-slate-300" />
                                                    <p className="font-medium text-slate-900">No registrations found</p>
                                                    <p className="text-sm">Click &quot;Register Works&quot; to get started.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map(reg => (
                                            <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900">{reg.work.title}</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{reg.work.iswc || "N/A"}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                                                        {reg.society}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{reg.totalSplitRegistered}%</td>
                                                <td className="px-4 py-3">{getMethodBadge(reg.submittedVia)}</td>
                                                <td className="px-4 py-3">{getStatusBadge(reg.status)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Batches */}
                {batches.length > 0 && (
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle>Recent Registration Batches</CardTitle>
                            <CardDescription>History of bulk registration submissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {batches.map(batch => (
                                    <div key={batch.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${batch.status === "COMPLETE" ? "bg-emerald-500" :
                                                    batch.status === "PROCESSING" ? "bg-amber-500 animate-pulse" :
                                                        batch.status === "FAILED" ? "bg-red-500" : "bg-slate-400"
                                                }`} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {batch.totalWorks} work(s) → {batch.societies.join(", ")}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(batch.createdAt).toLocaleDateString()} · via {batch.submittedVia === "TUNEREGISTRY" ? "TuneRegistry API" : "CWR"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {batch.accepted > 0 && (
                                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    {batch.accepted} accepted
                                                </Badge>
                                            )}
                                            {batch.rejected > 0 && (
                                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                                    {batch.rejected} failed
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="text-xs">
                                                {batch.submitted}/{batch.totalWorks}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <RegisterWizard
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onComplete={() => window.location.reload()}
                works={works}
            />
        </>
    );
}
