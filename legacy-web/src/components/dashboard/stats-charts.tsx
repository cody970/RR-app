"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const COLORS = ["#d97706", "#f59e0b", "#3b82f6", "#10b981", "#64748b", "#ef4444"];

export function ImpactChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return (
        <div className="h-64 flex items-center justify-center text-slate-500 italic">
            No impact data available yet.
        </div>
    );

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        itemStyle={{ color: "#d97706" }}
                        cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function SeverityPie({ data }: { data: any }) {
    const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

    if (chartData.length === 0) return (
        <div className="h-64 flex items-center justify-center text-slate-500 italic">
            No severity data.
        </div>
    );

    const SEVERITY_COLORS: any = {
        HIGH: "#ef4444",
        MEDIUM: "#f59e0b",
        LOW: "#3b82f6",
    };

    return (
        <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        itemStyle={{ color: "#475569" }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
