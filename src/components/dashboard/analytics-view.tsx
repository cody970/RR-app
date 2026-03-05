"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImpactChart, SeverityPie } from "./stats-charts";
import { Activity, ShieldCheck, Heart, TrendingUp, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
    PieChart, Pie, Cell,
    BarChart, Bar,
} from "recharts";

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

    const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-muted/50"
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
                    className="progress-ring-circle"
                    style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground animate-count-up">{score}%</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Health</span>
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
                <Card className="col-span-4 bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Revenue Impact by Issue</CardTitle>
                            <p className="text-xs text-muted-foreground">Estimated uncollected royalties in USD</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/15 to-yellow-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ImpactChart data={data.chartData} />
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Recovery Efficiency</CardTitle>
                            <p className="text-xs text-muted-foreground">Recovered vs. Estimated Leakage</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-green-500/10 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 animate-count-up">${data.totalRecovered.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground mb-1">of ${data.totalLeakage.toFixed(2)}</div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Recovery Rate</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.recoveryRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-1000 rounded-full"
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
                            <CardTitle className="text-foreground">Findings Trend</CardTitle>
                            <p className="text-xs text-muted-foreground">New findings over time</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/15 to-yellow-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="week"
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                        tickFormatter={(v) => {
                                            const d = new Date(v);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                    />
                                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                        itemStyle={{ color: "#d97706" }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#d97706"
                                        strokeWidth={2}
                                        fill="url(#trendGradient)"
                                        dot={{ r: 3, fill: "#d97706", strokeWidth: 0 }}
                                        name="Findings"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                                Run an audit to see trends
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Severity Distribution</CardTitle>
                            <p className="text-xs text-muted-foreground">Breakdown by risk level</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400/15 to-slate-500/10 flex items-center justify-center">
                            <Filter className="h-4 w-4 text-muted-foreground" />
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
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {severityPie.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2">
                                    {severityPie.map((s) => (
                                        <div key={s.name} className="flex items-center gap-2 text-sm">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span className="text-muted-foreground">{s.name}</span>
                                            <span className="text-foreground font-medium ml-auto">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                                No findings yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recovery Funnel */}
                <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Recovery Funnel</CardTitle>
                            <p className="text-xs text-muted-foreground">Finding resolution pipeline</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-green-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {funnel.some(f => f.count > 0) ? (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={funnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="stage"
                                        tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                                        width={70}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                                        itemStyle={{ color: "#d97706" }}
                                    />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                        {funnel.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                                No findings yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Health Score with Circular Ring */}
            <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 overflow-hidden relative rounded-2xl glass-card">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <Heart className="h-32 w-32 text-amber-500" />
                </div>
                <CardHeader>
                    <CardTitle className="text-foreground">Catalog Health Score</CardTitle>
                    <p className="text-sm text-muted-foreground">Overall data completeness across works and recordings</p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-8 flex-wrap">
                        <HealthScoreRing score={data.healthScore} />
                        <div className="flex-1 min-w-[200px] space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="text-xs text-muted-foreground font-medium">With Identifiers</div>
                                    <div className="text-xl font-bold text-foreground mt-1">{data.itemsWithId.toLocaleString()}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="text-xs text-muted-foreground font-medium">Total Items</div>
                                    <div className="text-xl font-bold text-foreground mt-1">{data.totalItems.toLocaleString()}</div>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                                {data.itemsWithId} of {data.totalItems} items have unique identifiers (ISWC/ISRC).
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
