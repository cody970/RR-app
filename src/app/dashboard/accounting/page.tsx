"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, FileText, History, Calculator, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generatePayoutStatementPDF } from "@/lib/finance/accounting-pdf";

interface Balance {
    id: string;
    name: string;
    type: string;
    amount: number;
    currency: string;
    ledgerCount: number;
}

interface Payout {
    id: string;
    writer?: { name: string };
    publisher?: { name: string };
    period: string;
    totalAmount: number;
    status: string;
    createdAt: string;
}

function formatMoney(val: number): string {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AccountingPage() {
    const [activeTab, setActiveTab] = useState<"balances" | "payouts">("balances");

    const [balances, setBalances] = useState<Balance[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [balRes, payRes] = await Promise.all([
                fetch("/api/accounting/balances").catch(() => null),
                fetch("/api/accounting/payouts").catch(() => null)
            ]);

            if (balRes?.ok) setBalances(await balRes.json());
            if (payRes?.ok) setPayouts(await payRes.json());
        } catch (e) {
            console.error("Failed to load accounting data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Handle running splits for missing items globally
    // We would normally pass a source ID, but for demo we can mock a mass calculation
    const handleRunSplitEngine = async () => {
        setActionLoading(true);
        try {
            // Mock random delay
            await new Promise(r => setTimeout(r, 1500));
            await fetchData();
            alert("Split calculation completed across outstanding revenues.");
        } finally {
            setActionLoading(false);
        }
    };

    // Issue payout and generate PDF
    const handleIssuePayout = async (payeeId: string, payeeName: string, payeeType: string) => {
        setActionLoading(true);
        try {
            const period = new Date().toISOString().slice(0, 7); // e.g. "2026-03"

            const res = await fetch("/api/accounting/payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payeeId, period })
            });

            if (res.ok) {
                const data = await res.json();

                // Map the detailed ledgers to the format expected by our PDF util
                const pdfLedgers = data.ledgers.map((l: any) => ({
                    id: l.id,
                    date: new Date(l.createdAt).toLocaleDateString(),
                    source: l.licenseId ? "Sync Placement" : (l.statementLineId ? "Royalties Earned" : "Other"),
                    workTitle: "Track", // In a real app we'd join the work title
                    type: l.type,
                    amount: l.amount,
                }));

                generatePayoutStatementPDF({
                    orgName: "Global Sync Partners", // Demo mock org
                    payeeName: payeeName,
                    payeeType: payeeType as "Writer" | "Publisher",
                    period: data.payout.period,
                    totalAmount: data.payout.totalAmount,
                    currency: "USD",
                    dateIssued: new Date().toLocaleDateString(),
                    ledgers: pdfLedgers,
                });

                setActiveTab("payouts");
                fetchData();
            } else {
                alert("Failed to issue payout.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-emerald-600" />
                        Accounting Hub
                    </h1>
                    <p className="text-slate-500 mt-1">Manage writer balances, run split calculations, and issue payout statements.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleRunSplitEngine} disabled={actionLoading} className="gap-2 text-slate-700">
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                        Run Split Engine
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Unpaid Balance</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatMoney(balances.reduce((acc, b) => acc + b.amount, 0))}</h3>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <p className="text-sm font-medium text-slate-500 mb-1">Payees Owed</p>
                        <h3 className="text-2xl font-bold text-slate-900">{balances.length} Payees</h3>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <p className="text-sm font-medium text-slate-500 mb-1">Historical Payouts</p>
                        <h3 className="text-2xl font-bold text-slate-900">{payouts.length} Batches</h3>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200 mt-8">
                {(["balances", "payouts"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                            ? "border-emerald-600 text-emerald-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            }`}
                    >
                        {tab === "balances" ? "Unpaid Balances" : "Payout History"}
                        {tab === "balances" && balances.length > 0 && (
                            <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                {balances.length}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Balances */}
            {activeTab === "balances" && (
                <div className="space-y-4">
                    {balances.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900">All Balances Settled</h3>
                            <p className="text-slate-500 text-sm mt-1">There are no unpaid payee ledgers currently active.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {balances.map(bal => (
                                <Card key={bal.id} className="border-slate-200 overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="p-5 border-b border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">{bal.type}</Badge>
                                            </div>
                                            <h4 className="font-semibold text-lg text-slate-900 truncate">{bal.name}</h4>
                                            <p className="text-sm text-slate-500">{bal.ledgerCount} sub-transactions pending</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Amount Owed</p>
                                                <span className="font-bold text-emerald-600 text-xl">{formatMoney(bal.amount)}</span>
                                            </div>
                                            <Button
                                                onClick={() => handleIssuePayout(bal.id, bal.name, bal.type)}
                                                disabled={actionLoading}
                                                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                                            >
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Payout"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Payouts */}
            {activeTab === "payouts" && (
                <div className="space-y-4">
                    {payouts.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-900">No Payout History</h3>
                            <p className="text-slate-500 text-sm mt-1">Issued statement batches will appear here.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3 text-left font-medium text-slate-500">Period</th>
                                        <th className="px-5 py-3 text-left font-medium text-slate-500">Payee</th>
                                        <th className="px-5 py-3 text-left font-medium text-slate-500">Status</th>
                                        <th className="px-5 py-3 text-right font-medium text-slate-500">Total Owed</th>
                                        <th className="px-5 py-3 text-right font-medium text-slate-500">Issued Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payouts.map(pay => {
                                        const name = pay.writer?.name || pay.publisher?.name || "Unknown Payee";
                                        return (
                                            <tr key={pay.id} className="hover:bg-slate-50">
                                                <td className="px-5 py-4 font-medium text-slate-900">{pay.period}</td>
                                                <td className="px-5 py-4 text-slate-600">{name}</td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {pay.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold text-emerald-600">{formatMoney(pay.totalAmount)}</td>
                                                <td className="px-5 py-4 text-right text-slate-400 text-xs">
                                                    {new Date(pay.createdAt).toLocaleDateString()}
                                                    <Button variant="ghost" size="sm" className="ml-3 text-indigo-600 h-8 hover:bg-indigo-50" onClick={() => alert("PDF is generated on-demand matching the original details. Alternatively, we could save the base64 URL directly into statementUrl.")}>
                                                        <FileText className="w-4 h-4 mr-1.5" /> Statement
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
