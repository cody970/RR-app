import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;

        // Get findings grouped by creation week for trend analysis
        const findings = await db.finding.findMany({
            where: { orgId },
            select: {
                id: true,
                type: true,
                severity: true,
                status: true,
                estimatedImpact: true,
                recoveredAmount: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        // Group by week
        const weeklyData: Record<string, {
            week: string;
            count: number;
            impact: number;
            recovered: number;
        }> = {};

        for (const f of findings) {
            const date = new Date(f.createdAt);
            // Get ISO week start (Monday)
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date.setDate(diff));
            const key = weekStart.toISOString().split("T")[0];

            if (!weeklyData[key]) {
                weeklyData[key] = { week: key, count: 0, impact: 0, recovered: 0 };
            }
            weeklyData[key].count++;
            weeklyData[key].impact += f.estimatedImpact || 0;
            weeklyData[key].recovered += f.recoveredAmount || 0;
        }

        const trends = Object.values(weeklyData).sort((a, b) =>
            a.week.localeCompare(b.week)
        );

        // Recovery funnel
        const statusCounts = findings.reduce(
            (acc: any, f: any) => {
                acc[f.status] = (acc[f.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const funnel = [
            { stage: "Open", count: statusCounts["OPEN"] || 0, color: "#a78bfa" },
            { stage: "Disputed", count: statusCounts["DISPUTED"] || 0, color: "#f59e0b" },
            { stage: "Recovered", count: statusCounts["RECOVERED"] || 0, color: "#10b981" },
            { stage: "Ignored", count: statusCounts["IGNORED"] || 0, color: "#6b7280" },
        ];

        // Severity breakdown
        const severityCounts = findings.reduce(
            (acc: any, f: any) => {
                acc[f.severity] = (acc[f.severity] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const severity = [
            { name: "High", value: severityCounts["HIGH"] || 0, color: "#ef4444" },
            { name: "Medium", value: severityCounts["MEDIUM"] || 0, color: "#f59e0b" },
            { name: "Low", value: severityCounts["LOW"] || 0, color: "#22c55e" },
        ];

        return NextResponse.json({ trends, funnel, severity });
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
