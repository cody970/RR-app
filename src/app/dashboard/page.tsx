import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import {
  SparkCard,
  SparkCardContent,
  SparkCardHeader,
  SparkCardTitle,
} from "@/components/spark";
import { Library, CheckCircle, FileWarning, TrendingDown, ArrowUpRight, ScanSearch } from "lucide-react";
import { DashboardAnalytics } from "@/components/dashboard/analytics-view";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) return null;

    const orgId = session.user.orgId;

    // 1. Fetch KPI Data
    const [workCount, recordsCount, findings] = await Promise.all([
        db.work.count({ where: { orgId } }),
        db.recording.count({ where: { orgId } }),
        db.finding.findMany({
            where: { orgId },
            select: {
                id: true,
                type: true,
                estimatedImpact: true,
                severity: true,
                status: true,
                recoveredAmount: true
            }
        }),
    ]);

    const totalItems = workCount + recordsCount;
    const highRiskFindings = await db.finding.count({
        where: { orgId, severity: "HIGH" }
    });

    const totalLeakage = findings.reduce((acc: number, f: any) => acc + (f.estimatedImpact || 0), 0);
    const totalRecovered = findings.reduce((acc: number, f: any) => acc + (f.recoveredAmount || 0), 0);
    const recoveryRate = totalLeakage > 0 ? (totalRecovered / totalLeakage) * 100 : 0;

    // 2. Prepare Analytics Data
    const [worksWithIswc, recordsWithIsrc] = await Promise.all([
        db.work.count({ where: { orgId, NOT: { iswc: null } } }),
        db.recording.count({ where: { orgId, NOT: { isrc: null } } }),
    ]);

    const itemsWithId = worksWithIswc + recordsWithIsrc;
    const healthScore = totalItems > 0 ? Math.round((itemsWithId / totalItems) * 100) : 100;

    const impactByType = findings.reduce((acc: Record<string, number>, f: any) => {
        acc[f.type] = (acc[f.type] || 0) + (f.estimatedImpact || 0);
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(impactByType).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
    }));

    const severityData = findings.reduce((acc: Record<string, number>, f: any) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const statusData = findings.reduce((acc: Record<string, number>, f: any) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const analyticsData = {
        healthScore,
        totalItems,
        itemsWithId,
        totalLeakage,
        totalRecovered,
        recoveryRate,
        chartData,
        severityData,
        statusData,
    };

    const kpiCards = [
        {
            title: "Total Catalog Items",
            value: totalItems.toLocaleString(),
            sub: `${workCount} Works • ${recordsCount} Recordings`,
            icon: Library,
            iconColor: "text-indigo-600 dark:text-indigo-400",
            iconBg: "from-indigo-500/15 to-violet-500/10",
            valueColor: "text-slate-900 dark:text-white",
            sparkVariant: "default" as const,
        },
        {
            title: "Metadata Match Rate",
            value: totalItems > 0 ? `${healthScore}%` : "0%",
            sub: "Average completeness",
            icon: CheckCircle,
            iconColor: "text-emerald-500 dark:text-emerald-400",
            iconBg: "from-emerald-500/15 to-teal-500/10",
            valueColor: "text-emerald-600 dark:text-emerald-400",
            sparkVariant: "highlighted" as const,
        },
        {
            title: "High Risk Anomalies",
            value: highRiskFindings.toString(),
            sub: "Conflicts detected",
            icon: FileWarning,
            iconColor: "text-rose-500 dark:text-rose-400",
            iconBg: "from-rose-500/15 to-orange-500/10",
            valueColor: highRiskFindings > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white",
            sparkVariant: "warning" as const,
        },
        {
            title: "Estimated Leakage",
            value: `$${totalLeakage.toLocaleString()}`,
            sub: "Pending recovery",
            icon: TrendingDown,
            iconColor: "text-violet-600 dark:text-violet-400",
            iconBg: "from-violet-500/15 to-fuchsia-500/10",
            valueColor: totalLeakage > 0 ? "text-violet-600 dark:text-violet-400" : "text-slate-900 dark:text-white",
            sparkVariant: "info" as const,
        },
    ];

    const delays = ["", "delay-100", "delay-200", "delay-300"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Overview of your catalog health and audit status</p>
                </div>
            </div>

            {/* Onboarding Wizard for empty catalogs */}
            {totalItems === 0 && <OnboardingWizard />}

            {totalItems > 0 && (
                <>
                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {kpiCards.map((card, i) => (
                            <SparkCard
                                key={card.title}
                                variant={card.sparkVariant}
                                className={`group overflow-hidden animate-slide-up opacity-0 ${delays[i]}`}
                            >
                                {/* Hover gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                                <SparkCardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                                    <SparkCardTitle className="text-sm font-medium text-muted-foreground">{card.title}</SparkCardTitle>
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} border border-border/50`}>
                                        <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} aria-hidden="true" />
                                    </div>
                                </SparkCardHeader>
                                <SparkCardContent className="relative z-10">
                                    <div className={`text-3xl font-bold ${card.valueColor} tracking-tight animate-count-up`}>
                                        {card.value}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                                        {card.sub}
                                    </p>
                                </SparkCardContent>
                            </SparkCard>
                        ))}
                    </div>

                    {/* Analytics */}
                    <DashboardAnalytics data={analyticsData} />

                    {/* Bottom Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <SparkCard className="col-span-4">
                            <SparkCardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                                <SparkCardTitle className="text-slate-900 dark:text-white text-lg font-black tracking-tight">Recent Audit Findings</SparkCardTitle>
                                {findings.length > 0 && (
                                    <a
                                        href="/dashboard/audit"
                                        className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                        aria-label="View all audit findings"
                                    >
                                        View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                                    </a>
                                )}
                            </SparkCardHeader>
                            <SparkCardContent className="pt-6">
                                <div className="flex h-[320px] items-center justify-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10">
                                    {findings.length > 0 ? (
                                        <div className="text-center space-y-4">
                                            <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                                </div>
                                                {findings.length} findings detected
                                            </div>
                                            <div>
                                                <a href="/dashboard/audit" className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                                                    Review Audit Engine
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4 pt-6 pb-6">
                                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <ScanSearch className="h-8 w-8 text-slate-400" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <span className="block text-sm text-slate-500 mb-4 font-medium">No results to display yet</span>
                                                <a href="/dashboard/import" className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10">
                                                    Import Catalog
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SparkCardContent>
                        </SparkCard>

                        <div className="col-span-3">
                            <ActivityFeed />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
