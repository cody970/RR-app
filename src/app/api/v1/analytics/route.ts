/**
 * Public API — Analytics Endpoints
 *
 * GET /api/v1/analytics — Summary analytics for the organization
 *
 * Query Parameters:
 *   view   — summary (default), revenue, findings
 *   period — 30d, 90d, 1y, all (default: 90d)
 *
 * Authenticated via API key (Bearer token).
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    const authHeader = req.headers.get("Authorization");
    const key = authHeader?.replace("Bearer ", "");

    const organization = await validateApiKey(key || null);
    if (!organization) {
        return NextResponse.json(
            { error: "Unauthorized: Invalid API Key" },
            { status: 401 },
        );
    }

    const orgId = organization.id;
    const { searchParams } = new URL(req.url);

    const view = searchParams.get("view") || "summary";
    const period = searchParams.get("period") || "90d";

    // Calculate date cutoff based on period
    const now = new Date();
    let since: Date | null = null;
    switch (period) {
        case "30d":
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case "90d":
            since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case "1y":
            since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        case "all":
            since = null;
            break;
        default:
            since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    try {
        const result: Record<string, unknown> = { view, period };

        // ---------- Summary View ----------
        if (view === "summary" || view === "all") {
            const findingsWhere: Record<string, unknown> = { orgId };
            if (since) findingsWhere.createdAt = { gte: since };

            const [
                totalWorks,
                totalRecordings,
                totalFindings,
                openFindings,
                recoveredFindings,
                totalStatements,
            ] = await Promise.all([
                db.work.count({ where: { orgId } }),
                db.recording.count({ where: { orgId } }),
                db.finding.count({ where: findingsWhere }),
                db.finding.count({ where: { ...findingsWhere, status: "OPEN" } }),
                db.finding.count({ where: { ...findingsWhere, status: "RECOVERED" } }),
                db.statement.count({ where: { orgId } }),
            ]);

            // Aggregate financial impact
            const impactAgg = await db.finding.aggregate({
                where: findingsWhere,
                _sum: {
                    estimatedImpact: true,
                    recoveredAmount: true,
                },
            });

            result.summary = {
                catalog: {
                    works: totalWorks,
                    recordings: totalRecordings,
                },
                findings: {
                    total: totalFindings,
                    open: openFindings,
                    recovered: recoveredFindings,
                    disputed: await db.finding.count({
                        where: { ...findingsWhere, status: "DISPUTED" },
                    }),
                    ignored: await db.finding.count({
                        where: { ...findingsWhere, status: "IGNORED" },
                    }),
                },
                financials: {
                    estimatedImpact: impactAgg._sum.estimatedImpact || 0,
                    recoveredAmount: impactAgg._sum.recoveredAmount || 0,
                    recoveryRate:
                        impactAgg._sum.estimatedImpact && impactAgg._sum.estimatedImpact > 0
                            ? Math.round(
                                  ((impactAgg._sum.recoveredAmount || 0) /
                                      impactAgg._sum.estimatedImpact) *
                                      100,
                              )
                            : 0,
                },
                statements: totalStatements,
            };
        }

        // ---------- Revenue View ----------
        if (view === "revenue" || view === "all") {
            const periodsWhere: Record<string, unknown> = { orgId };
            if (since) periodsWhere.startDate = { gte: since };

            const periods = await db.royaltyPeriod.findMany({
                where: periodsWhere,
                orderBy: { startDate: "asc" },
                select: {
                    id: true,
                    source: true,
                    startDate: true,
                    endDate: true,
                    totalAmount: true,
                    lineCount: true,
                },
            });

            // Group by source (society)
            const bySociety: Record<string, { periods: typeof periods; total: number }> = {};
            for (const p of periods) {
                const key = p.source || "UNKNOWN";
                if (!bySociety[key]) {
                    bySociety[key] = { periods: [], total: 0 };
                }
                bySociety[key].periods.push(p);
                bySociety[key].total += p.totalAmount || 0;
            }

            result.revenue = {
                periods,
                bySociety: Object.entries(bySociety).map(([society, data]) => ({
                    society,
                    totalRevenue: Math.round(data.total * 100) / 100,
                    periodCount: data.periods.length,
                })),
                totalRevenue:
                    Math.round(
                        periods.reduce((sum, p) => sum + (p.totalAmount || 0), 0) * 100,
                    ) / 100,
            };
        }

        // ---------- Findings Breakdown View ----------
        if (view === "findings" || view === "all") {
            const findingsWhere: Record<string, unknown> = { orgId };
            if (since) findingsWhere.createdAt = { gte: since };

            const [byType, bySeverity] = await Promise.all([
                db.finding.groupBy({
                    by: ["type"],
                    where: findingsWhere,
                    _count: { id: true },
                    _sum: { estimatedImpact: true, recoveredAmount: true },
                }),
                db.finding.groupBy({
                    by: ["severity"],
                    where: findingsWhere,
                    _count: { id: true },
                    _sum: { estimatedImpact: true },
                }),
            ]);

            result.findings = {
                byType: byType.map((t) => ({
                    type: t.type,
                    count: t._count.id,
                    estimatedImpact: t._sum.estimatedImpact || 0,
                    recoveredAmount: t._sum.recoveredAmount || 0,
                })),
                bySeverity: bySeverity.map((s) => ({
                    severity: s.severity,
                    count: s._count.id,
                    estimatedImpact: s._sum.estimatedImpact || 0,
                })),
            };
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Analytics API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}