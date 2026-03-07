import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import {
    SparkCard,
    SparkCardContent,
    SparkCardHeader,
    SparkCardTitle,
    SparkBadge,
} from "@/components/spark";
import { Music, AlertCircle, DollarSign, PieChart, TrendingUp } from "lucide-react";
import { SplitPieChart, type SplitSlice } from "@/components/portal/split-pie-chart";

export default async function PortalDashboard() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            writer: {
                include: {
                    works: {
                        include: {
                            work: {
                                include: {
                                    writers: {
                                        include: { writer: true }
                                    }
                                }
                            }
                        }
                    },
                    ledgerEntries: {
                        where: { type: "EARNING" },
                        select: { amount: true, currency: true },
                    }
                }
            }
        }
    });

    const writer = user?.writer;

    if (!writer) {
        return (
            <div className="max-w-3xl mx-auto mt-6 sm:mt-10 px-4">
                <SparkCard variant="warning">
                    <SparkCardHeader>
                        <SparkCardTitle className="flex items-center gap-2 text-amber-800 text-base sm:text-lg">
                            <AlertCircle className="h-5 w-5" aria-hidden="true" />
                            No Writer Profile Linked
                        </SparkCardTitle>
                    </SparkCardHeader>
                    <SparkCardContent className="text-amber-700 text-sm sm:text-base">
                        Your account hasn&apos;t been linked to a Writer profile yet. Please contact your organization owner to link your account.
                    </SparkCardContent>
                </SparkCard>
            </div>
        );
    }

    const linkedWorksCount = writer.works.length;
    const totalEarnings = writer.ledgerEntries?.reduce(
        (sum: number, e: { amount: number }) => sum + e.amount, 0
    ) || 0;

    // Aggregate split data for the overview pie chart (average across all works)
    const avgSplit = linkedWorksCount > 0
        ? writer.works.reduce((sum: number, ww: { splitPercent: number }) => sum + ww.splitPercent, 0) / linkedWorksCount
        : 0;

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Welcome, {writer.name}</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <SparkCard variant="default" className="border-t-4 border-t-amber-500">
                    <SparkCardHeader className="pb-1 sm:pb-2">
                        <SparkCardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 flex items-center justify-between">
                            Works
                            <Music className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        </SparkCardTitle>
                    </SparkCardHeader>
                    <SparkCardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">{linkedWorksCount}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Registered works</p>
                    </SparkCardContent>
                </SparkCard>

                <SparkCard variant="highlighted" className="border-t-4 border-t-emerald-500">
                    <SparkCardHeader className="pb-1 sm:pb-2">
                        <SparkCardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 flex items-center justify-between">
                            Earnings
                            <DollarSign className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                        </SparkCardTitle>
                    </SparkCardHeader>
                    <SparkCardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                            ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Total earnings</p>
                    </SparkCardContent>
                </SparkCard>

                <SparkCard variant="default" className="border-t-4 border-t-indigo-500">
                    <SparkCardHeader className="pb-1 sm:pb-2">
                        <SparkCardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 flex items-center justify-between">
                            Avg Split
                            <PieChart className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                        </SparkCardTitle>
                    </SparkCardHeader>
                    <SparkCardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">{avgSplit.toFixed(1)}%</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Average ownership</p>
                    </SparkCardContent>
                </SparkCard>

                <SparkCard variant="info" className="border-t-4 border-t-violet-500">
                    <SparkCardHeader className="pb-1 sm:pb-2">
                        <SparkCardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 flex items-center justify-between">
                            Per-Work Avg
                            <TrendingUp className="h-4 w-4 text-violet-500" aria-hidden="true" />
                        </SparkCardTitle>
                    </SparkCardHeader>
                    <SparkCardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                            ${linkedWorksCount > 0 ? (totalEarnings / linkedWorksCount).toFixed(2) : "0.00"}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Avg earnings/work</p>
                    </SparkCardContent>
                </SparkCard>
            </div>

            {/* Catalog with Split Visualization */}
            <div className="mt-6 sm:mt-8">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Your Catalog</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {writer.works.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No works found in your catalog.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {writer.works.map((ww: {
                                work: {
                                    id: string;
                                    title: string;
                                    iswc: string | null;
                                    writers: Array<{
                                        writer: { name: string };
                                        splitPercent: number;
                                    }>;
                                };
                                splitPercent: number;
                                role: string | null;
                            }) => {
                                // Build pie slices for this work
                                const slices: SplitSlice[] = ww.work.writers.map((w) => ({
                                    label: w.writer.name,
                                    percent: w.splitPercent,
                                    isCurrentUser: w.writer.name === writer.name,
                                }));

                                return (
                                    <div key={ww.work.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                            {/* Work info */}
                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                    <Music className="h-5 w-5 text-amber-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-900 truncate">{ww.work.title}</p>
                                                    <p className="text-[10px] sm:text-xs text-slate-500">
                                                        ISWC: {ww.work.iswc || "Pending"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 sm:hidden">
                                                    <SparkBadge variant="success">
                                                        {ww.splitPercent}%
                                                    </SparkBadge>
                                                    <span className="text-[10px] text-slate-400">{ww.role || "Writer"}</span>
                                                </div>
                                            </div>

                                            {/* Mini pie chart — visible on larger screens */}
                                            {slices.length > 1 && (
                                                <div className="hidden sm:block flex-shrink-0">
                                                    <SplitPieChart slices={slices} size={80} />
                                                </div>
                                            )}

                                            {/* Split badge — visible on larger screens */}
                                            <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                                                <SparkBadge variant="success">
                                                    {ww.splitPercent}% Share
                                                </SparkBadge>
                                                <span className="text-xs text-slate-400">{ww.role || "Writer"}</span>
                                            </div>
                                        </div>

                                        {/* Mobile: show mini pie below */}
                                        {slices.length > 1 && (
                                            <div className="sm:hidden mt-3 pt-3 border-t border-slate-100">
                                                <SplitPieChart slices={slices} size={140} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}