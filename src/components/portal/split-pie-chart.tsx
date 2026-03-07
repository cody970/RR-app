"use client";

import { useMemo } from "react";

// ---------- Types ----------

export interface SplitSlice {
    label: string;
    percent: number;
    color?: string;
    isCurrentUser?: boolean;
}

interface SplitPieChartProps {
    slices: SplitSlice[];
    size?: number;
    className?: string;
}

// ---------- Color Palette ----------

const COLORS = [
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#10b981", // emerald
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#f97316", // orange
    "#ec4899", // pink
    "#14b8a6", // teal
    "#84cc16", // lime
];

// ---------- Component ----------

export function SplitPieChart({ slices, size = 200, className = "" }: SplitPieChartProps) {
    const center = size / 2;
    const radius = size / 2 - 8;
    const innerRadius = radius * 0.55; // Donut hole

    const segments = useMemo(() => {
        let startAngle = -90; // Start from top
        return slices.map((slice, i) => {
            const angle = (slice.percent / 100) * 360;
            const endAngle = startAngle + angle;
            const color = slice.color || COLORS[i % COLORS.length];

            // Calculate arc path
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);

            const ix1 = center + innerRadius * Math.cos(startRad);
            const iy1 = center + innerRadius * Math.sin(startRad);
            const ix2 = center + innerRadius * Math.cos(endRad);
            const iy2 = center + innerRadius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            // Donut segment path
            const path = [
                `M ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${ix2} ${iy2}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
                "Z",
            ].join(" ");

            // Label position (midpoint of arc, outside)
            const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
            const labelRadius = radius * 0.78;
            const labelX = center + labelRadius * Math.cos(midAngle);
            const labelY = center + labelRadius * Math.sin(midAngle);

            const segment = {
                path,
                color,
                label: slice.label,
                percent: slice.percent,
                isCurrentUser: slice.isCurrentUser,
                labelX,
                labelY,
                showLabel: slice.percent >= 8, // Only show label if segment is big enough
            };

            startAngle = endAngle;
            return segment;
        });
    }, [slices, center, radius, innerRadius]);

    const totalPercent = slices.reduce((sum, s) => sum + s.percent, 0);
    const unallocated = Math.max(0, 100 - totalPercent);

    return (
        <div className={`flex flex-col items-center gap-4 ${className}`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
                {/* Background circle for unallocated */}
                <circle cx={center} cy={center} r={radius} fill="#f1f5f9" />
                <circle cx={center} cy={center} r={innerRadius} fill="white" />

                {/* Segments */}
                {segments.map((seg, i) => (
                    <g key={i}>
                        <path
                            d={seg.path}
                            fill={seg.color}
                            stroke="white"
                            strokeWidth="2"
                            className={`transition-opacity duration-200 hover:opacity-80 ${
                                seg.isCurrentUser ? "drop-shadow-md" : ""
                            }`}
                        />
                        {seg.showLabel && (
                            <text
                                x={seg.labelX}
                                y={seg.labelY}
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="fill-white text-[10px] font-bold pointer-events-none"
                            >
                                {seg.percent}%
                            </text>
                        )}
                    </g>
                ))}

                {/* Center text */}
                <text
                    x={center}
                    y={center - 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-slate-900 text-lg font-bold"
                >
                    {totalPercent}%
                </text>
                <text
                    x={center}
                    y={center + 12}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-slate-400 text-[10px]"
                >
                    allocated
                </text>
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: seg.color }}
                        />
                        <span className={`text-xs ${seg.isCurrentUser ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                            {seg.label} ({seg.percent}%)
                        </span>
                    </div>
                ))}
                {unallocated > 0.5 && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-200" />
                        <span className="text-xs text-slate-400">
                            Unallocated ({unallocated.toFixed(1)}%)
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}