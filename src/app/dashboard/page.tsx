import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    const totalLeakage = findings.reduce((acc, f) => acc + (f.estimatedImpact || 0), 0);
    const totalRecovered = findings.reduce((acc, f) => acc + (f.recoveredAmount || 0), 0);
    const recoveryRate = totalLeakage > 0 ? (totalRecovered / totalLeakage) * 100 : 0;

    // 2. Prepare Analytics Data
    const [worksWithIswc, recordsWithIsrc] = await Promise.all([
        db.work.count({ where: { orgId, NOT: { iswc: null } } }),
        db.recording.count({ where: { orgId, NOT: { isrc: null } } }),
    ]);

    const itemsWithId = worksWithIswc + recordsWithIsrc;
    const healthScore = totalItems > 0 ? Math.round((itemsWithId / totalItems) * 100) : 100;

    const impactByType = findings.reduce((acc: Record<string, number>, f) => {
        acc[f.type] = (acc[f.type] || 0) + (f.estimatedImpact || 0);
        return acc;
    }, {});

    const chartData = Object.entries(impactByType).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
    }));

    const severityData = findings.reduce((acc: Record<string, number>, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
    }, {});

    const statusData = findings.reduce((acc: Record<string, number>, f) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
    }, {});

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
            iconColor: "text-amber-600 dark:text-amber-400",
            iconBg: "from-amber-500/15 to-yellow-500/10",
            valueColor: "text-foreground",
            borderAccent: "hover:border-amber-300 dark:hover:border-amber-500/30",
        },
        {
            title: "Match Rate",
            value: totalItems > 0 ? `${healthScore}%` : "0%",
            sub: "Metadata completeness",
            icon: CheckCircle,
            iconColor: "text-emerald-600 dark:text-emerald-400",
            iconBg: "from-emerald-500/15 to-green-500/10",
            valueColor: "text-emerald-600 dark:text-emerald-400",
            borderAccent: "hover:border-emerald-300 dark:hover:border-emerald-500/30",
        },
        {
            title: "High Risk Anomalies",
            value: highRiskFindings.toString(),
            sub: "Conflicts & missing identifiers",
            icon: FileWarning,
            iconColor: "text-rose-600 dark:text-rose-400",
            iconBg: "from-rose-500/15 to-pink-500/10",
            valueColor: highRiskFindings > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground",
            borderAccent: highRiskFindings > 0 ? "hover:border-rose-300 dark:hover:border-rose-500/30 animate-border-glow" : "hover:border-slate-300",
        },
        {
            title: "Estimated Leakage",
            value: `$${totalLeakage.toFixed(2)}`,
            sub: "Likely uncollected royalties",
            icon: TrendingDown,
            iconColor: "text-violet-600 dark:text-violet-400",
            iconBg: "from-violet-500/15 to-purple-500/10",
            valueColor: totalLeakage > 0 ? "text-violet-600 dark:text-violet-400" : "text-foreground",
            borderAccent: "hover:border-violet-300 dark:hover:border-violet-500/30",
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
                            <Card key={card.title} className={`group relative rounded-2xl bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 ${card.borderAccent} transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-slide-up opacity-0 ${delays[i]}`}>
                                {/* Hover gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                                <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} border border-border/50`}>
                                        <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className={`text-3xl font-bold ${card.valueColor} tracking-tight animate-count-up`}>
                                        {card.value}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                                        {card.sub}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Analytics */}
                    <DashboardAnalytics data={analyticsData} />

                    {/* Bottom Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4 rounded-2xl bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20">
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                                <CardTitle className="text-foreground text-lg font-semibold">Recent Audit Findings</CardTitle>
                                {findings.length > 0 && (
                                    <a
                                        href="/dashboard/audit"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                    >
                                        View all <ArrowUpRight className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex h-[300px] items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/30">
                                    {findings.length > 0 ? (
                                        <div className="text-center space-y-3">
                                            <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                                <CheckCircle className="h-5 w-5" />
                                                {findings.length} findings detected
                                            </div>
                                            <div>
                                                <a href="/dashboard/audit" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 text-sm font-medium transition-colors hover:underline">
                                                    View and resolve them in Audit Engine →
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-3 pt-6 pb-6">
                                            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center border border-border">
                                                <ScanSearch className="h-7 w-7 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <span className="block text-sm text-muted-foreground mb-1 font-medium">No audits run yet</span>
                                                <a href="/dashboard/import" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 text-sm font-medium transition-colors hover:underline">
                                                    Import catalog to get started →
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="col-span-3">
                            <ActivityFeed />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
