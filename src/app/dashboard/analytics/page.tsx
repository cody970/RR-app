"use client";

import { useEffect, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Loader2,
    BarChart3,
    Globe,
    Music,
    DollarSign,
    Activity,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
    RevenueBySocietyChart,
    TopWorksChart,
    TerritoryChart,
    WorkTrendsChart,
    CumulativeRecoveryChart,
} from "@/components/dashboard/trend-charts";
import { exportToCSV, exportToJSON } from "@/lib/export-utils";

interface TrendData {
    // Existing
    trends: Array<{ week: string; count: number; impact: number; recovered: number }>;
    funnel: Array<{ stage: string; count: number; color: string }>;
    severity: Array<{ name: string; value: number; color: string }>;
    // New
    revenueBySociety: Array<Record<string, any>>;
    forecastPeriods: Array<{ period: string; total: number; isForecast: boolean }>;
    regressionStats: { slope: number; rSquared: number; trend: string };
    topWorks: Array<{ workId: string; title: string; totalRevenue: number; totalUses: number }>;
    territories: Array<{ territory: string; revenue: number; uses: number; lineCount: number }>;
    workTrends: Array<Record<string, any>>;
    workTrendLabels: string[];
}

export default function AnalyticsPage() {
    const [data, setData] = useState<TrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"revenue" | "recovery" | "catalog">("revenue");
    const toast = useToast();

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/analytics/trends?view=overview");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error("Failed to fetch analytics:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <span className="ml-3 text-slate-500">Loading analytics...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-24">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900">No Data Available</h3>
                <p className="text-slate-500 mt-1">
                    Import statements and run audits to see analytics.
                </p>
            </div>
        );
    }

    // Compute summary stats
    const totalRevenue = data.revenueBySociety.reduce((sum, r) => sum + (r.total || 0), 0);
    const latestPeriod = data.revenueBySociety[data.revenueBySociety.length - 1];
    const prevPeriod = data.revenueBySociety[data.revenueBySociety.length - 2];
    const periodChange = latestPeriod && prevPeriod
        ? ((latestPeriod.total - prevPeriod.total) / prevPeriod.total) * 100
        : 0;

    const totalFindings = data.funnel.reduce((sum, f) => sum + f.count, 0);
    const recoveredCount = data.funnel.find(f => f.stage === "Recovered")?.count || 0;
    const totalImpact = data.trends.reduce((sum, t) => sum + t.impact, 0);
    const totalRecovered = data.trends.reduce((sum, t) => sum + t.recovered, 0);

    const TrendIcon = data.regressionStats.trend === "growing"
        ? TrendingUp
        : data.regressionStats.trend === "declining"
            ? TrendingDown
            : Minus;

    const trendColor = data.regressionStats.trend === "growing"
        ? "text-emerald-600"
        : data.regressionStats.trend === "declining"
            ? "text-red-600"
            : "text-slate-500";

    // Export handlers
    const handleExportRevenue = () => {
        const exportData = data.revenueBySociety.map(r => {
            const { period, total, ...societies } = r;
            return {
                Period: period,
                TotalRevenue: total,
                ...societies
            };
        });
        exportToCSV("revenue_trends", exportData);
        toast.success("Revenue trends exported to CSV");
    };

    const handleExportTerritories = () => {
        const exportData = data.territories.map(t => ({
            Territory: t.territory,
            Revenue: t.revenue,
            Uses: t.uses,
            LineCount: t.lineCount
        }));
        exportToCSV("territory_breakdown", exportData);
        toast.success("Territory breakdown exported to CSV");
    };

    const handleExportTopWorks = () => {
        const exportData = data.topWorks.map(w => ({
            WorkId: w.workId,
            Title: w.title,
            TotalRevenue: w.totalRevenue,
            TotalUses: w.totalUses
        }));
        exportToCSV("top_works", exportData);
        toast.success("Top works exported to CSV");
    };

    const handleExportAll = () => {
        exportToJSON("analytics_report", {
            exportedAt: new Date().toISOString(),
            summary: {
                totalRevenue,
                periodChange,
                trend: data.regressionStats.trend,
                rSquared: data.regressionStats.rSquared,
                totalFindings,
                recoveredCount,
                totalImpact,
                totalRecovered
            },
            revenueBySociety: data.revenueBySociety,
            forecastPeriods: data.forecastPeriods,
            topWorks: data.topWorks,
            territories: data.territories,
            workTrends: data.workTrends
        });
        toast.success("Full analytics report exported to JSON");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics & Trends</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Revenue intelligence, trend analysis, and forecasting for your catalog.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportRevenue}
                        disabled={data.revenueBySociety.length === 0}
                        className="text-xs"
                    >
                        <Download className="h-3 w-3 mr-1" />
                        Revenue CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportAll}
                        className="text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300"
                    >
                        <Download className="h-3 w-3 mr-1" />
                        Full Report
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Revenue</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {periodChange !== 0 && (
                                    <div className={`flex items-center gap-1 mt-1 text-xs ${periodChange > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {periodChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                        {Math.abs(periodChange).toFixed(1)}% vs prev quarter
                                    </div>
                                )}
                            </div>
                            <div className="p-3 rounded-lg bg-emerald-50">
                                <DollarSign className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Revenue Trend</p>
                                <p className={`text-2xl font-bold capitalize ${trendColor}`}>
                                    {data.regressionStats.trend}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    R² = {data.regressionStats.rSquared.toFixed(2)}
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${data.regressionStats.trend === "growing" ? "bg-emerald-50" : data.regressionStats.trend === "declining" ? "bg-red-50" : "bg-slate-50"}`}>
                                <TrendIcon className={`h-6 w-6 ${trendColor}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Findings</p>
                                <p className="text-2xl font-bold text-slate-900">{totalFindings}</p>
                                <p className="text-xs text-emerald-600 mt-1">
                                    {recoveredCount} recovered
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-50">
                                <Target className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Recovery Rate</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {totalImpact > 0 ? ((totalRecovered / totalImpact) * 100).toFixed(0) : 0}%
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    ${totalRecovered.toLocaleString()} of ${totalImpact.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-50">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                {[
                    { key: "revenue" as const, label: "Revenue", icon: DollarSign },
                    { key: "recovery" as const, label: "Recovery", icon: Target },
                    { key: "catalog" as const, label: "Catalog", icon: Music },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            activeTab === key
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Revenue Tab */}
            {activeTab === "revenue" && (
                <div className="space-y-6">
                    {/* Revenue by Society */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-amber-500" />
                                Revenue by Society
                            </CardTitle>
                            <CardDescription>
                                Quarterly revenue trends across all societies with 2-quarter forecast
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.revenueBySociety.length > 0 ? (
                                <RevenueBySocietyChart
                                    data={data.revenueBySociety}
                                    forecastData={data.forecastPeriods}
                                />
                            ) : (
                                <p className="text-center text-slate-400 py-12">No revenue data yet</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Works */}
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Music className="h-5 w-5 text-amber-500" />
                                        Top Works by Revenue
                                    </CardTitle>
                                    <CardDescription>
                                        Highest-earning works across all periods
                                    </CardDescription>
                                </div>
                                {data.topWorks.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleExportTopWorks}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        <Download className="h-3 w-3 mr-1" />
                                        CSV
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {data.topWorks.length > 0 ? (
                                    <TopWorksChart data={data.topWorks} />
                                ) : (
                                    <p className="text-center text-slate-400 py-12">No work data yet</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Territory Breakdown */}
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="h-5 w-5 text-amber-500" />
                                        Revenue by Territory
                                    </CardTitle>
                                    <CardDescription>
                                        Geographic distribution of royalty income
                                    </CardDescription>
                                </div>
                                {data.territories.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleExportTerritories}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        <Download className="h-3 w-3 mr-1" />
                                        CSV
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {data.territories.length > 0 ? (
                                    <TerritoryChart data={data.territories} />
                                ) : (
                                    <p className="text-center text-slate-400 py-12">No territory data yet</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Work Trends */}
                    {data.workTrends.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top 5 Works — Period Trends</CardTitle>
                                <CardDescription>
                                    Revenue trends for your highest-earning works over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <WorkTrendsChart
                                    data={data.workTrends}
                                    labels={data.workTrendLabels}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Recovery Tab */}
            {activeTab === "recovery" && (
                <div className="space-y-6">
                    {/* Cumulative Recovery */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cumulative Recovery vs. Estimated Leakage</CardTitle>
                            <CardDescription>
                                Track how much revenue has been recovered compared to total estimated impact
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.trends.length > 0 ? (
                                <CumulativeRecoveryChart data={data.trends} />
                            ) : (
                                <p className="text-center text-slate-400 py-12">No finding data yet</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recovery Funnel */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recovery Funnel</CardTitle>
                                <CardDescription>Finding status distribution</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {data.funnel.map((stage) => {
                                        const maxCount = Math.max(...data.funnel.map(f => f.count), 1);
                                        return (
                                            <div key={stage.stage} className="flex items-center gap-3">
                                                <span className="text-sm text-slate-600 w-20">{stage.stage}</span>
                                                <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                                        style={{
                                                            width: `${Math.max((stage.count / maxCount) * 100, 5)}%`,
                                                            backgroundColor: stage.color,
                                                        }}
                                                    >
                                                        <span className="text-xs font-medium text-white">
                                                            {stage.count}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Severity Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Severity Breakdown</CardTitle>
                                <CardDescription>Findings by severity level</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.severity.map((s) => (
                                        <div key={s.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: s.color }}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{s.name}</span>
                                            </div>
                                            <Badge variant="outline" className="font-mono">
                                                {s.value}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Catalog Tab */}
            {activeTab === "catalog" && (
                <div className="space-y-6">
                    {/* Forecast */}
                    {data.forecastPeriods.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-amber-500" />
                                    Revenue Forecast
                                </CardTitle>
                                <CardDescription>
                                    Projected revenue for the next 2 quarters based on linear regression
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {data.forecastPeriods.map((fp) => (
                                        <div
                                            key={fp.period}
                                            className="p-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/50"
                                        >
                                            <p className="text-sm text-amber-700 font-medium">{fp.period}</p>
                                            <p className="text-2xl font-bold text-amber-900 mt-1">
                                                ${fp.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <Badge variant="outline" className="mt-2 text-amber-600 border-amber-200 bg-amber-50">
                                                Projected
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-4">
                                    Forecast based on linear regression (R² = {data.regressionStats.rSquared.toFixed(2)}).
                                    Higher R² values indicate more reliable predictions.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Territory Table */}
                    {data.territories.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Territory Details</CardTitle>
                                <CardDescription>Revenue breakdown by territory</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Territory</th>
                                                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                                                <th className="px-4 py-3 text-right font-medium">Uses</th>
                                                <th className="px-4 py-3 text-right font-medium">Lines</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.territories.map((t) => (
                                                <tr key={t.territory} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-medium text-slate-700">{t.territory}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900 font-mono">
                                                        ${t.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600">
                                                        {t.uses.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500">
                                                        {t.lineCount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}