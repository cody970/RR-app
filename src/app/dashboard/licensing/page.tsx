"use client";

import { useState, useEffect, useCallback } from "react";
import { Briefcase, FileText, CheckCircle2, DollarSign, Globe, Calendar, Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------

interface Opportunity {
    id: string;
    title: string;
    description: string;
    budget: string;
    deadline: string;
    media: string;
    territory: string;
    status: string;
    createdAt: string;
    work?: { id: string; title: string };
}

interface Request {
    id: string;
    requesterName: string;
    requesterCompany: string;
    projectTitle: string;
    projectType: string;
    media: string;
    term: string;
    budget: number;
    territory?: string;
    notes?: string;
    status: string;
    createdAt: string;
    work: { id: string; title: string };
    License?: { id: string; status: string };
}

interface License {
    id: string;
    licenseType: string;
    licenseeName: string;
    fee: number;
    startDate: string;
    endDate: string;
    status: string;
    createdAt: string;
    work: { id: string; title: string };
    request?: { id: string; projectTitle: string; projectType: string };
}

function formatMoney(val: number): string {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LicensingPage() {
    const [activeTab, setActiveTab] = useState<"opportunities" | "requests" | "licenses">("requests");

    // Data states
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showNewOppForm, setShowNewOppForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // New Opp Form state
    const [oppForm, setOppForm] = useState({
        title: "", description: "", budget: "", deadline: "", media: "", territory: ""
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [oppRes, reqRes, licRes] = await Promise.all([
                fetch("/api/licensing/opportunities").catch(() => null),
                fetch("/api/licensing/requests").catch(() => null),
                fetch("/api/licensing/licenses").catch(() => null),
            ]);

            if (oppRes?.ok) setOpportunities(await oppRes.json());
            if (reqRes?.ok) setRequests(await reqRes.json());
            if (licRes?.ok) setLicenses(await licRes.json());
        } catch (e) {
            console.error("Failed to load licensing data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateOpp = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch("/api/licensing/opportunities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oppForm),
            });
            if (res.ok) {
                setShowNewOppForm(false);
                setOppForm({ title: "", description: "", budget: "", deadline: "", media: "", territory: "" });
                fetchData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateRequestStatus = async (id: string, newStatus: string) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/licensing/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setSelectedRequest(null);
                fetchData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleIssueLicense = async (req: Request) => {
        setActionLoading(true);
        try {
            const res = await fetch("/api/licensing/issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId: req.id,
                    workId: req.work.id,
                    licenseeName: req.requesterCompany || req.requesterName,
                    fee: req.budget || 0,
                    licenseType: "SYNC",
                    media: req.media,
                }),
            });
            if (res.ok) {
                setSelectedRequest(null);
                setActiveTab("licenses");
                fetchData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-indigo-600" />
                        Licensing Hub
                    </h1>
                    <p className="text-slate-500 mt-1">Manage sync briefs, incoming requests, and issued licenses.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/public/license/request`);
                        }}
                    >
                        Copy Request Link
                    </Button>
                    {activeTab === "opportunities" && (
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setShowNewOppForm(true)}>
                            <Plus className="w-4 h-4" /> New Brief
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200">
                {(["requests", "opportunities", "licenses"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === "requests" && requests.filter(r => r.status === "PENDING").length > 0 && (
                            <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                {requests.filter(r => r.status === "PENDING").length}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Requests */}
            {activeTab === "requests" && (
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900">No License Requests</h3>
                            <p className="text-slate-500 text-sm mt-1">Share your public request link to start receiving sync requests.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {requests.map(req => (
                                <Card key={req.id} className="cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setSelectedRequest(req)}>
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant={req.status === "PENDING" ? "default" : req.status === "APPROVED" ? "outline" : "secondary"}
                                                className={req.status === "PENDING" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                                                    req.status === "APPROVED" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}
                                            >
                                                {req.status}
                                            </Badge>
                                            <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-semibold text-slate-900 truncate">{req.projectTitle || "Untitled Project"}</h4>
                                        <p className="text-sm text-slate-500 truncate mb-4">{req.projectType} • {req.requesterCompany || req.requesterName}</p>
                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                <span className="truncate max-w-[120px]">{req.work.title}</span>
                                            </div>
                                            {req.budget && <span className="font-medium text-emerald-600">{formatMoney(req.budget)}</span>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-semibold">{selectedRequest.projectTitle}</h3>
                                <p className="text-sm text-slate-500">{selectedRequest.requesterCompany || selectedRequest.requesterName}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Requested Work</p>
                                    <p className="font-semibold flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-500" /> {selectedRequest.work.title}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Status</p>
                                    <Badge>{selectedRequest.status}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Project Type</p>
                                    <p>{selectedRequest.projectType}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Media / Territory</p>
                                    <p>{selectedRequest.media || "TBD"} • {selectedRequest.territory || "World"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Term</p>
                                    <p>{selectedRequest.term || "TBD"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Proposed Budget</p>
                                    <p className="text-emerald-600 font-semibold">{selectedRequest.budget ? formatMoney(selectedRequest.budget) : "TBD"}</p>
                                </div>
                            </div>
                            {selectedRequest.notes && (
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-2">Notes</p>
                                    <p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">{selectedRequest.notes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                                {selectedRequest.status === "PENDING" && (
                                    <>
                                        <Button variant="outline" className="text-red-600" onClick={() => handleUpdateRequestStatus(selectedRequest.id, "REJECTED")} disabled={actionLoading}>Reject</Button>
                                        <Button onClick={() => handleUpdateRequestStatus(selectedRequest.id, "REVIEWING")} disabled={actionLoading}>Move to Review</Button>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateRequestStatus(selectedRequest.id, "APPROVED")} disabled={actionLoading}>Approve Request</Button>
                                    </>
                                )}
                                {selectedRequest.status === "REVIEWING" && (
                                    <>
                                        <Button variant="outline" className="text-red-600" onClick={() => handleUpdateRequestStatus(selectedRequest.id, "REJECTED")} disabled={actionLoading}>Reject</Button>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateRequestStatus(selectedRequest.id, "APPROVED")} disabled={actionLoading}>Approve Request</Button>
                                    </>
                                )}
                                {selectedRequest.status === "APPROVED" && !selectedRequest.License && (
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleIssueLicense(selectedRequest)} disabled={actionLoading}>
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Issue License
                                    </Button>
                                )}
                                {selectedRequest.License && (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">License Issued</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab: Opportunities */}
            {activeTab === "opportunities" && (
                <div className="space-y-4">
                    {showNewOppForm && (
                        <Card className="border-indigo-200 bg-indigo-50/30">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-lg">Create Licensing Brief</h3>
                                    <button onClick={() => setShowNewOppForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                                </div>
                                <form onSubmit={handleCreateOpp} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input required placeholder="Brief Title (e.g., Upbeat Pop for Commercial)" className="col-span-2 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={oppForm.title} onChange={e => setOppForm({ ...oppForm, title: e.target.value })} />
                                        <input placeholder="Budget (e.g., $5k - $10k)" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={oppForm.budget} onChange={e => setOppForm({ ...oppForm, budget: e.target.value })} />
                                        <input type="date" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={oppForm.deadline} onChange={e => setOppForm({ ...oppForm, deadline: e.target.value })} />
                                        <input placeholder="Media (TV, Film, Digital...)" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={oppForm.media} onChange={e => setOppForm({ ...oppForm, media: e.target.value })} />
                                        <input placeholder="Territory (World, US, etc.)" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={oppForm.territory} onChange={e => setOppForm({ ...oppForm, territory: e.target.value })} />
                                        <textarea placeholder="Description & Reference Tracks..." className="col-span-2 flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={oppForm.description} onChange={e => setOppForm({ ...oppForm, description: e.target.value })} />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <Button type="button" variant="outline" onClick={() => setShowNewOppForm(false)}>Cancel</Button>
                                        <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Brief"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {opportunities.length === 0 && !showNewOppForm ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900">No Open Briefs</h3>
                            <p className="text-slate-500 text-sm mt-1">Create an opportunity to start organizing potential sync placements.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {opportunities.map(opp => (
                                <Card key={opp.id} className="border-slate-200">
                                    <CardContent className="p-5 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-semibold text-lg">{opp.title}</h4>
                                                <Badge variant="outline" className={opp.status === "OPEN" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}>{opp.status}</Badge>
                                            </div>
                                            <div className="flex gap-4 text-sm text-slate-500">
                                                {opp.budget && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{opp.budget}</span>}
                                                {opp.deadline && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(opp.deadline).toLocaleDateString()}</span>}
                                                {opp.media && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {opp.media}</span>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Licenses */}
            {activeTab === "licenses" && (
                <div className="space-y-4">
                    {licenses.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900">No Issued Licenses</h3>
                            <p className="text-slate-500 text-sm mt-1">When you approve a request and issue a license, it will appear here.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Licensee / Project</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Work</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Type</th>
                                        <th className="px-4 py-3 text-right font-medium text-slate-500">Fee</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                                        <th className="px-4 py-3 text-right font-medium text-slate-500">Issued</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {licenses.map(lic => (
                                        <tr key={lic.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-900">{lic.licenseeName}</p>
                                                <p className="text-xs text-slate-500">{lic.request?.projectTitle}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{lic.work.title}</td>
                                            <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{lic.licenseType}</Badge></td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatMoney(lic.fee)}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {lic.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-400 text-xs">{new Date(lic.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
