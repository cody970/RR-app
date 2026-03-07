"use client";

import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ---------- Color Palette ----------

const SOCIETY_COLORS: Record<string, string> = {
    ASCAP: "#6366f1",
    BMI: "#f59e0b",
    MLC: "#10b981",
    SOUNDEXCHANGE: "#ef4444",
    total: "#8b5cf6",
};

const WORK_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#ec4899",
    "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16",
];

const TERRITORY_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#ec4899",
    "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16",
    "#a855f7", "#22d3ee", "#fb923c", "#4ade80", "#f472b6",
];

// ---------- Formatters ----------

const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatCompact = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
};

// ---------- Revenue by Society Line Chart ----------

interface RevenueBySocietyProps {
    data: Array<Record<string, any>>;
    forecastData?: Array<Record<string, any>>;
    societies?: string[];
}

export function RevenueBySocietyChart({ data, forecastData = [], societies }: RevenueBySocietyProps) {
    // Detect societies from data
    const detectedSocieties = societies || Array.from(
        new Set(data.flatMap(d => Object.keys(d).filter(k => k !== "period" && k !== "total")))
    );

    // Merge actual + forecast data
    const chartData = [
        ...data.map(d => ({ ...d, isForecast: false })),
        ...forecastData.map(d => ({ ...d, isForecast: true })),
    ];

    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                />
                <Legend />
                {/* Total revenue line */}
                <Line
                    type="monotone"
                    dataKey="total"
                    stroke={SOCIETY_COLORS.total}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Total"
                />
                {/* Per-society lines */}
                {detectedSocieties.map((society) => (
                    <Line
                        key={society}
                        type="monotone"
                        dataKey={society}
                        stroke={SOCIETY_COLORS[society] || "#94a3b8"}
                        strokeWidth={1.5}
                        strokeDasharray={undefined}
                        dot={{ r: 3 }}
                        name={society}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}

// ---------- Top Works Bar Chart ----------

interface TopWorksProps {
    data: Array<{ title: string; totalRevenue: number; totalUses: number }>;
}

export function TopWorksChart({ data }: TopWorksProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                    type="number"
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fontSize: 11, fill: "#334155" }}
                    width={110}
                />
                <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                    }}
                />
                <Bar dataKey="totalRevenue" name="Revenue" radius={[0, 4, 4, 0]}>
                    {data.map((_, index) => (
                        <Cell key={index} fill={WORK_COLORS[index % WORK_COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ---------- Territory Pie Chart ----------

interface TerritoryProps {
    data: Array<{ territory: string; revenue: number }>;
}

export function TerritoryChart({ data }: TerritoryProps) {
    const total = data.reduce((sum, d) => sum + d.revenue, 0);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="revenue"
                    nameKey="territory"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ territory, revenue }) =>
                        `${territory} (${((revenue / total) * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: "#94a3b8" }}
                >
                    {data.map((_, index) => (
                        <Cell key={index} fill={TERRITORY_COLORS[index % TERRITORY_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

// ---------- Work Trends Area Chart ----------

interface WorkTrendsProps {
    data: Array<Record<string, any>>;
    labels: string[];
}

export function WorkTrendsChart({ data, labels }: WorkTrendsProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                    }}
                />
                <Legend />
                {labels.map((label, i) => (
                    <Area
                        key={label}
                        type="monotone"
                        dataKey={label}
                        stackId="1"
                        stroke={WORK_COLORS[i % WORK_COLORS.length]}
                        fill={WORK_COLORS[i % WORK_COLORS.length]}
                        fillOpacity={0.3}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ---------- Cumulative Recovery Chart ----------

interface RecoveryTrendProps {
    data: Array<{ week: string; impact: number; recovered: number }>;
}

export function CumulativeRecoveryChart({ data }: RecoveryTrendProps) {
    // Calculate cumulative values
    let cumImpact = 0;
    let cumRecovered = 0;
    const cumData = data.map(d => {
        cumImpact += d.impact;
        cumRecovered += d.recovered;
        return {
            week: d.week,
            cumulativeImpact: Math.round(cumImpact),
            cumulativeRecovered: Math.round(cumRecovered),
            gap: Math.round(cumImpact - cumRecovered),
        };
    });

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cumData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                    }}
                />
                <Legend />
                <Area
                    type="monotone"
                    dataKey="cumulativeImpact"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.1}
                    name="Estimated Leakage"
                />
                <Area
                    type="monotone"
                    dataKey="cumulativeRecovered"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                    name="Recovered"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}