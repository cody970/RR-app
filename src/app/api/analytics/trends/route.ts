/**
 * Analytics Trends API — Extended
 *
 * GET /api/analytics/trends
 *
 * Returns comprehensive trend data including:
 * - Weekly finding trends (existing)
 * - Recovery funnel (existing)
 * - Severity breakdown (existing)
 * - Multi-quarter revenue time-series by society (NEW)
 * - Top works revenue comparison across periods (NEW)
 * - Territory breakdown (NEW)
 * - Revenue forecasting (NEW)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { ApiErrors } from "@/lib/api/error-response";
import { withCache, generateCacheKey } from "@/lib/infra/cache-utils";
import { linearRegression, forecastNextPeriods, round, roundMoney } from "@/lib/finance/math-utils";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();
        const orgId = session.user.orgId;

        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        const { searchParams } = new URL(req.url);
        const view = searchParams.get("view") || "overview"; // overview, revenue, works, territory

        const cacheKey = generateCacheKey("analytics:trends:v2", { orgId, view });

        const result = await withCache(cacheKey, async () => {
            // ---------- Core Trends (always included) ----------

            // 1. Weekly Finding Trends
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

            // ---------- Revenue Time-Series (NEW) ----------

            // 4. Multi-quarter revenue by society
            const royaltyPeriods = await db.royaltyPeriod.findMany({
                where: { orgId, workId: "" }, // Org-level aggregates (workId = "")
                select: {
                    society: true,
                    period: true,
                    totalAmount: true,
                    totalUses: true,
                    avgRate: true,
                    changePercent: true,
                },
                orderBy: { period: "asc" },
            });

            // Group by period for time-series chart
            const periodMap = new Map<string, Record<string, number>>();
            for (const rp of royaltyPeriods) {
                if (!periodMap.has(rp.period)) {
                    periodMap.set(rp.period, { total: 0 });
                }
                const entry = periodMap.get(rp.period)!;
                entry[rp.society] = roundMoney(rp.totalAmount);
                entry.total = roundMoney((entry.total || 0) + rp.totalAmount);
            }

            const revenueBySociety = Array.from(periodMap.entries())
                .map(([period, data]) => ({ period, ...data }))
                .sort((a, b) => a.period.localeCompare(b.period));

            // 5. Revenue forecasting
            const totalsByPeriod = revenueBySociety.map((r, i) => ({
                x: i,
                y: r.total as number,
            }));

            const { forecasts, regression } = forecastNextPeriods(totalsByPeriod, 2);

            // Generate forecast period labels
            const forecastPeriods = forecasts.map((f, i) => {
                const lastPeriod = revenueBySociety[revenueBySociety.length - 1]?.period || "2025-Q1";
                return {
                    period: getNextPeriod(lastPeriod, i + 1),
                    total: f.y,
                    isForecast: true,
                };
            });

            // 6. Top works by revenue (across all periods)
            const topWorksRaw = await db.royaltyPeriod.groupBy({
                by: ["workId"],
                where: {
                    orgId,
                    workId: { not: "" },
                },
                _sum: { totalAmount: true, totalUses: true },
                orderBy: { _sum: { totalAmount: "desc" } },
                take: 10,
            });

            // Fetch work titles
            const topWorkIds = topWorksRaw
                .map((w: any) => w.workId)
                .filter(Boolean) as string[];

            const workDetails = topWorkIds.length > 0
                ? await db.work.findMany({
                    where: { id: { in: topWorkIds } },
                    select: { id: true, title: true },
                })
                : [];
            const workTitleMap = new Map(workDetails.map(w => [w.id, w.title]));

            const topWorks = topWorksRaw.map((w: any) => ({
                workId: w.workId,
                title: workTitleMap.get(w.workId) || "Unknown",
                totalRevenue: roundMoney(w._sum.totalAmount || 0),
                totalUses: w._sum.totalUses || 0,
            }));

            // 7. Territory breakdown
            const territoryRaw = await db.statementLine.groupBy({
                by: ["territory"],
                where: {
                    statement: { orgId },
                    territory: { not: null },
                },
                _sum: { amount: true, uses: true },
                _count: { _all: true },
                orderBy: { _sum: { amount: "desc" } },
                take: 15,
            });

            const territories = territoryRaw.map((t: any) => ({
                territory: t.territory || "Unknown",
                revenue: roundMoney(t._sum.amount || 0),
                uses: t._sum.uses || 0,
                lineCount: t._count._all,
            }));

            // 8. Per-work period trends (for top 5 works)
            const top5WorkIds = topWorkIds.slice(0, 5);
            let workTrends: any[] = [];

            if (top5WorkIds.length > 0) {
                const workPeriods = await db.royaltyPeriod.findMany({
                    where: {
                        orgId,
                        workId: { in: top5WorkIds },
                    },
                    select: {
                        workId: true,
                        period: true,
                        totalAmount: true,
                        society: true,
                    },
                    orderBy: { period: "asc" },
                });

                // Group by period, with each work as a column
                const workPeriodMap = new Map<string, Record<string, number>>();
                for (const wp of workPeriods) {
                    if (!wp.workId) continue;
                    if (!workPeriodMap.has(wp.period)) {
                        workPeriodMap.set(wp.period, {});
                    }
                    const entry = workPeriodMap.get(wp.period)!;
                    entry[wp.workId] = roundMoney((entry[wp.workId] || 0) + wp.totalAmount);
                }

                workTrends = Array.from(workPeriodMap.entries())
                    .map(([period, data]) => {
                        const row: Record<string, any> = { period };
                        for (const wId of top5WorkIds) {
                            row[workTitleMap.get(wId) || wId] = data[wId] || 0;
                        }
                        return row;
                    })
                    .sort((a, b) => a.period.localeCompare(b.period));
            }

            return {
                // Existing
                trends,
                funnel,
                severity,
                // New: Revenue analytics
                revenueBySociety,
                forecastPeriods,
                regressionStats: {
                    slope: regression.slope,
                    rSquared: regression.rSquared,
                    trend: regression.slope > 0 ? "growing" : regression.slope < 0 ? "declining" : "stable",
                },
                topWorks,
                territories,
                workTrends,
                workTrendLabels: top5WorkIds.map(id => workTitleMap.get(id) || id),
            };
        }, 300); // 5 minute TTL

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Trends API error:", error);
        return ApiErrors.Internal(error?.message || "Internal Server Error");
    }
}

// ---------- Helpers ----------

/**
 * Get the Nth next period from a given period string (e.g., "2025-Q1" → "2025-Q2").
 */
function getNextPeriod(period: string, offset: number): string {
    const match = period.match(/^(\d{4})-Q(\d)$/);
    if (!match) return `${period}+${offset}`;

    let year = parseInt(match[1], 10);
    let quarter = parseInt(match[2], 10);

    quarter += offset;
    while (quarter > 4) {
        quarter -= 4;
        year++;
    }

    return `${year}-Q${quarter}`;
}