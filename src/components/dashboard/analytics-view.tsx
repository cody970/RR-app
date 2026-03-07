"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImpactChart } from "./stats-charts";
import { Activity, ShieldCheck, Heart, TrendingUp, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

interface TrendData {
    week: string;
    count: number;
    impact: number;
    recovered: number;
}

interface FunnelData {
    stage: string;
    count: number;
    color: string;
}

interface SeverityData {
    name: string;
    value: number;
    color: string;
}

function HealthScoreRing({ score }: { score: number }) {
    const size = 140;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color = score >= 80 ? "#6366f1" : score >= 50 ? "#a855f7" : "#ef4444";

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-muted/20"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground tracking-tighter">{score}%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Health</span>
            </div>
        </div>
    );
}

export function DashboardAnalytics({ data }: { data: any }) {
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [funnel, setFunnel] = useState<FunnelData[]>([]);
    const [severityPie, setSeverityPie] = useState<SeverityData[]>([]);

    useEffect(() => {
        fetch("/api/analytics/trends")
            .then(res => res.ok ? res.json() : null)
            .then(d => {
                if (d) {
                    setTrends(d.trends || []);
                    setFunnel(d.funnel || []);
                    setSeverityPie(d.severity || []);
                }
            })
            .catch(() => { });
    }, []);

    return (
        <div className="space-y-6 mt-8">
            {/* Row 1: Impact Chart + Recovery Efficiency */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
                        <TrendingUp className="h-32 w-32 text-indigo-500" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground tracking-tight">Revenue Impact by Issue</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">Estimated uncollected royalties in USD</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-sm">
                            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ImpactChart data={data.chartData} />
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
                        <ShieldCheck className="h-32 w-32 text-violet-500" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground tracking-tight">Recovery Efficiency</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">Recovered vs. Estimated Leakage</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-sm">
                            <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tighter">${data.totalRecovered.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">of ${data.totalLeakage.toFixed(2)}</div>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-bold uppercase tracking-widest">Recovery Progress</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{data.recoveryRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-1000 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                    style={{ width: `${data.recoveryRate}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Trends Area Chart + Severity Pie + Recovery Funnel */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Findings Trend */}
                <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground text-sm font-bold tracking-tight">Findings Trend</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">New findings over time</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis
                                        dataKey="week"
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(v) => {
                                            const d = new Date(v);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "rgba(var(--card), 0.8)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 700 }}
                                        itemStyle={{ color: "#6366f1", fontWeight: 600 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fill="url(#trendGradient)"
                                        dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="Findings"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm font-medium italic">
                                Run an audit to see trends
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground text-sm font-bold tracking-tight">Severity Distribution</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">Breakdown by risk level</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Filter className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {severityPie.some(s => s.value > 0) ? (
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="50%" height={160}>
                                    <PieChart>
                                        <Pie
                                            data={severityPie}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={60}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {severityPie.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2.5 flex-1">
                                    {severityPie.map((s) => (
                                        <div key={s.name} className="flex items-center gap-2 text-xs">
                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span className="text-muted-foreground font-semibold">{s.name}</span>
                                            <span className="text-foreground font-bold ml-auto">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm font-medium italic">
                                No findings yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recovery Funnel */}
                <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground text-sm font-bold tracking-tight">Recovery Funnel</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">Finding resolution pipeline</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {funnel.some(f => f.count > 0) ? (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={funnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }} hide />
                                    <YAxis
                                        type="category"
                                        dataKey="stage"
                                        tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 700 }}
                                        width={80}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "rgba(var(--card), 0.8)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                                        itemStyle={{ color: "#6366f1", fontWeight: 600 }}
                                    />
                                    <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                                        {funnel.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm font-medium italic">
                                No findings yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Health Score with Circular Ring */}
            <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 overflow-hidden relative rounded-2xl glass-card">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                    <Heart className="h-48 w-48 text-indigo-500" />
                </div>
                <CardHeader>
                    <CardTitle className="text-foreground tracking-tight">Catalog Health Score</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">Overall data completeness across works and recordings</p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-10 flex-wrap">
                        <HealthScoreRing score={data.healthScore} />
                        <div className="flex-1 min-w-[200px] space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 shadow-sm">
                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">With Identifiers</div>
                                    <div className="text-2xl font-bold text-foreground mt-1 tracking-tight">{data.itemsWithId.toLocaleString()}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 shadow-sm">
                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Total Items</div>
                                    <div className="text-2xl font-bold text-foreground mt-1 tracking-tight">{data.totalItems.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                                <Activity className="h-5 w-5 text-indigo-500 mt-0.5" />
                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                    <span className="text-foreground font-bold">{data.itemsWithId}</span> of <span className="text-foreground font-bold">{data.totalItems}</span> items have unique identifiers (ISWC/ISRC), contributing to a <span className="text-indigo-600 dark:text-indigo-400 font-bold">Resilient</span> status.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
