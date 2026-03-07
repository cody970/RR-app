import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { ApiErrors } from "@/lib/api/error-response";
import { withCache, generateCacheKey } from "@/lib/infra/cache-utils";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();
        const orgId = session.user.orgId;

        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        const cacheKey = generateCacheKey("analytics:trends", { orgId });

        const result = await withCache(cacheKey, async () => {
            // 1. Weekly Trends via raw query for date_trunc efficiency
            const trendsRaw: any[] = await db.$queryRaw`
                SELECT 
                    date_trunc('week', "createdAt") as week,
                    COUNT(*)::int as count,
                    COALESCE(SUM("estimatedImpact"), 0)::float as impact,
                    COALESCE(SUM("recoveredAmount"), 0)::float as recovered
                FROM "Finding"
                WHERE "orgId" = ${orgId}
                GROUP BY 1
                ORDER BY 1 ASC;
            `;

            const trends = trendsRaw.map(t => ({
                week: t.week.toISOString().split("T")[0],
                count: t.count,
                impact: t.impact,
                recovered: t.recovered
            }));

            // 2. Status counts (Recovery Funnel)
            const statusGroup = await db.finding.groupBy({
                by: ["status"],
                where: { orgId },
                _count: { _all: true }
            });

            const statusCounts: Record<string, number> = {};
            statusGroup.forEach((g: { status: string; _count: { _all: number } }) => {
                statusCounts[g.status] = g._count._all;
            });

            const funnel = [
                { stage: "Open", count: statusCounts["OPEN"] || 0, color: "#a78bfa" },
                { stage: "Disputed", count: statusCounts["DISPUTED"] || 0, color: "#f59e0b" },
                { stage: "Recovered", count: statusCounts["RECOVERED"] || 0, color: "#10b981" },
                { stage: "Ignored", count: statusCounts["IGNORED"] || 0, color: "#6b7280" },
            ];

            // 3. Severity breakdown
            const severityGroup = await db.finding.groupBy({
                by: ["severity"],
                where: { orgId },
                _count: { _all: true }
            });

            const severityCounts: Record<string, number> = {};
            severityGroup.forEach((g: { severity: string; _count: { _all: number } }) => {
                severityCounts[g.severity] = g._count._all;
            });

            const severity = [
                { name: "High", value: severityCounts["HIGH"] || 0, color: "#ef4444" },
                { name: "Medium", value: severityCounts["MEDIUM"] || 0, color: "#f59e0b" },
                { name: "Low", value: severityCounts["LOW"] || 0, color: "#22c55e" },
            ];

            return { trends, funnel, severity };
        }, 300); // 5 minute TTL

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Trends API error:", error);
        return ApiErrors.Internal(error?.message || "Internal Server Error");
    }
}
