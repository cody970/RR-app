"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImpactChart, SeverityPie } from "./stats-charts";
import { Activity, ShieldCheck, Heart, TrendingUp, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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
                <Card className="col-span-4 bg-white border-slate-200 shadow-sm shadow-slate-200/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900">Revenue Impact by Issue</CardTitle>
                            <p className="text-xs text-slate-500">Estimated uncollected royalties in USD</p>
                        </div>
                        <Activity className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <ImpactChart data={data.chartData} />
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-white border-slate-200 shadow-sm shadow-slate-200/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900">Recovery Efficiency</CardTitle>
                            <p className="text-xs text-slate-500">Recovered vs. Estimated Leakage</p>
                        </div>
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold text-emerald-600">${data.totalRecovered.toFixed(2)}</div>
                            <div className="text-sm text-slate-500 mb-1">of ${data.totalLeakage.toFixed(2)}</div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Recovery Rate</span>
                                <span className="text-emerald-600 font-medium">{data.recoveryRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                    style={{ width: `${data.recoveryRate}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Trends Line Chart + Severity Pie + Recovery Funnel */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Findings Trend */}
                <Card className="bg-white border-slate-200 shadow-sm shadow-slate-200/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900">Findings Trend</CardTitle>
                            <p className="text-xs text-slate-500">New findings over time</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        {trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={trends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="week"
                                        tick={{ fill: "#64748b", fontSize: 10 }}
                                        tickFormatter={(v) => {
                                            const d = new Date(v);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                    />
                                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                        labelStyle={{ color: "#475569" }}
                                        itemStyle={{ color: "#d97706" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#d97706"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: "#d97706" }}
                                        name="Findings"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
                                Run an audit to see trends
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card className="bg-white border-slate-200 shadow-sm shadow-slate-200/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900">Severity Distribution</CardTitle>
                            <p className="text-xs text-slate-500">Breakdown by risk level</p>
                        </div>
                        <Filter className="h-4 w-4 text-slate-500" />
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
                                            <span className="text-slate-500">{s.name}</span>
                                            <span className="text-slate-900 font-medium ml-auto">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">
                                No findings yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recovery Funnel */}
                <Card className="bg-white border-slate-200 shadow-sm shadow-slate-200/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900">Recovery Funnel</CardTitle>
                            <p className="text-xs text-slate-500">Finding resolution pipeline</p>
                        </div>
                        <Activity className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {funnel.some(f => f.count > 0) ? (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={funnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="stage"
                                        tick={{ fill: "#475569", fontSize: 11 }}
                                        width={70}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                        itemStyle={{ color: "#d97706" }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {funnel.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">
                                No findings yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Health Score */}
            <Card className="bg-white border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Heart className="h-32 w-32 text-amber-500" />
                </div>
                <CardHeader>
                    <CardTitle className="text-slate-900">Catalog Health Score</CardTitle>
                    <p className="text-sm text-slate-500">Overall data completeness across works and recordings</p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4">
                        <div className="text-6xl font-bold text-amber-600">{data.healthScore}%</div>
                        <div className="flex-1 max-w-sm mb-2">
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-1000"
                                    style={{ width: `${data.healthScore}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-4 font-medium">
                        {data.itemsWithId} of {data.totalItems} items have unique identifiers (ISWC/ISRC).
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
