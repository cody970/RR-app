import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, AlertCircle, Wallet, History, TrendingUp } from "lucide-react";

export default async function PortalDashboard() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) return null;

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            writer: {
                include: {
                    works: {
                        include: { work: true }
                    },
                    payeeLedgers: true
                }
            },
            publisher: {
                include: {
                    payeeLedgers: true
                }
            }
        }
    });

    const writer = user?.writer;
    const publisher = user?.publisher;
    const payee = writer || publisher;

    if (!payee) {
        return (
            <div className="max-w-3xl mx-auto mt-10">
                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-800">
                            <AlertCircle className="h-5 w-5" />
                            No Profile Linked
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-amber-700">
                        Your account hasn't been linked to a Writer or Publisher profile yet. Please contact your organization administrator to link your account.
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Financial Stats
    const ledgers = payee.payeeLedgers || [];
    const unpaidBalance = ledgers
        .filter((l: any) => l.status === "UNPAID")
        .reduce((sum: number, l: any) => sum + l.amount, 0);

    const lifetimeEarnings = ledgers
        .reduce((sum: number, l: any) => sum + l.amount, 0);

    const linkedWorksCount = writer?.works.length || 0;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900">Welcome back, {payee.name}</h2>
                <p className="text-sm text-slate-500">Here's an overview of your creator performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Registered Works */}
                <Card className="border-slate-200/60 shadow-sm border-t-4 border-t-blue-500 bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center justify-between">
                            Active Works
                            <Music className="h-4 w-4 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">{linkedWorksCount}</div>
                        <p className="text-xs text-slate-400 mt-1">Tracks in your managed catalog</p>
                    </CardContent>
                </Card>

                {/* Unpaid Balance */}
                <Card className="border-slate-200/60 shadow-sm border-t-4 border-t-indigo-500 bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center justify-between">
                            Current Balance
                            <Wallet className="h-4 w-4 text-indigo-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">
                            ${unpaidBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Pending next payout period</p>
                    </CardContent>
                </Card>

                {/* Lifetime Earnings */}
                <Card className="border-slate-200/60 shadow-sm border-t-4 border-t-emerald-500 bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center justify-between">
                            Lifetime Earnings
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">
                            ${lifetimeEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Total royalties accrued to date</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area - Recent Catalog */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <History className="h-5 w-5 text-indigo-500" />
                            Recent Works
                        </h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                        {writer?.works && writer.works.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {writer.works.slice(0, 5).map((ww: any) => (
                                    <div key={ww.work.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                <Music className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{ww.work.title}</p>
                                                <p className="text-xs text-slate-400 tracking-wide font-mono uppercase">{ww.work.iswc || "NO ISWC"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                                                {ww.splitPercent}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Music className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-900">No works found</p>
                                    <p className="text-xs text-slate-400">Tracks will appear here once linked to your profile.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar area - Payout Activity or similar */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Important Updates</h3>
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-2">Notice</p>
                        <h4 className="text-lg font-bold mb-3">Q1 2026 Reporting</h4>
                        <p className="text-sm text-indigo-50 opacity-90 leading-relaxed mb-4">
                            Royalty statements for the first quarter of 2026 are currently being processed. You will be notified via email once they are ready for download.
                        </p>
                        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white w-2/3 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
