import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
    DollarSign,
    Download,
    FileText,
    TrendingUp,
    Wallet,
    Calendar,
    ArrowUpRight,
    History
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PortalEarnings() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) return null;

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            writer: {
                include: {
                    payeeLedgers: {
                        orderBy: { createdAt: 'desc' },
                        include: { payout: true }
                    },
                    payouts: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            },
            publisher: {
                include: {
                    payeeLedgers: {
                        orderBy: { createdAt: 'desc' },
                        include: { payout: true }
                    },
                    payouts: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            }
        }
    });

    const payee = user?.writer || user?.publisher;
    if (!payee) return null;

    const ledgers = payee.payeeLedgers || [];
    const payouts = payee.payouts || [];

    const unpaidBalance = ledgers
        .filter((l: any) => l.status === "UNPAID")
        .reduce((sum: number, l: any) => sum + l.amount, 0);

    const lifetimeEarnings = ledgers
        .reduce((sum: number, l: any) => sum + l.amount, 0);

    const lastPayout = payouts[0]?.totalAmount || 0;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900">Earnings & Statements</h2>
                <p className="text-sm text-slate-500">Track your royalty income and download official accounting statements.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden group">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <Wallet className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Balance</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">
                            ${unpaidBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-indigo-500" />
                            Next payout cycle upcoming
                        </p>
                    </div>
                </Card>

                <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden group">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Payout</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">
                            ${lastPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-emerald-500" />
                            {payouts[0] ? new Date(payouts[0].createdAt).toLocaleDateString() : 'No payouts yet'}
                        </p>
                    </div>
                </Card>

                <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden group">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifetime Accrued</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">
                            ${lifetimeEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Aggregate earnings history</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Payout History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        Payout History
                    </h3>
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                        {payouts.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {payouts.map((p: any) => (
                                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{p.period}</p>
                                                <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-slate-900">${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <a href={`/api/portal/statement/${p.id}`} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50">
                                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                                    PDF
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center gap-3">
                                <FileText className="h-10 w-10 text-slate-200" />
                                <p className="text-sm text-slate-500">No payout statements available yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Ledger Entries */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <History className="h-5 w-5 text-indigo-500" />
                        Recent Earnings
                    </h3>
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                        {ledgers.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {ledgers.slice(0, 8).map((l: any) => (
                                    <div key={l.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{l.type}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                                                {l.status} • {new Date(l.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-600">+${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center gap-3">
                                <DollarSign className="h-10 w-10 text-slate-200" />
                                <p className="text-sm text-slate-500">No individual earnings records found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border ${className}`}>
            {children}
        </div>
    );
}
