"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#64748b", "#f43f5e"];

export function ImpactChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic gap-2">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                <BarChart className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-xs font-medium">No impact data available yet.</p>
        </div>
    );

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="currentColor"
                        className="text-muted-foreground/60"
                        fontSize={10}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="currentColor"
                        className="text-muted-foreground/60"
                        fontSize={10}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(0,0,0,0.05)",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                        }}
                        itemStyle={{ color: "#6366f1", fontWeight: 700, fontSize: "12px" }}
                        cursor={{ fill: "rgba(99, 102, 241, 0.04)" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
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
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic gap-2">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                <PieChart className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-xs font-medium">No severity data.</p>
        </div>
    );

    const SEVERITY_COLORS: any = {
        HIGH: "#f43f5e",
        MEDIUM: "#f59e0b",
        LOW: "#6366f1",
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
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={SEVERITY_COLORS[entry.name] || COLORS[index % COLORS.length]}
                                fillOpacity={0.9}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(0,0,0,0.05)",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                        }}
                        itemStyle={{ color: "#475569", fontWeight: 600, fontSize: "12px" }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
