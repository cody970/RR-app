import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { apiError } from "@/lib/infra/utils";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return apiError("Unauthorized", 401);
        const orgId = session.user.orgId;

        const { searchParams } = new URL(req.url);
        const view = searchParams.get("view") || "summary";
        const period = searchParams.get("period");
        const society = searchParams.get("society");

        if (view === "summary") {
            const statements = await db.statement.findMany({
                where: { orgId: orgId! },
                select: {
                    id: true,
                    source: true,
                    period: true,
                    totalAmount: true,
                    lineCount: true,
                    fileName: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            });

            const totalEarned = statements.reduce((s: number, st: any) => s + (st.totalAmount || 0), 0);
            const totalStatements = statements.length;
            const latestPeriod = statements[0]?.period || "N/A";

            const bySociety = statements.reduce((acc: Record<string, number>, st: any) => {
                acc[st.source] = (acc[st.source] || 0) + (st.totalAmount || 0);
                return acc;
            }, {} as Record<string, number>);

            const topSociety = Object.entries(bySociety).sort((a: any, b: any) => b[1] - a[1])[0];

            const periods = await db.royaltyPeriod.findMany({
                where: { orgId: orgId!, workId: null },
                orderBy: { period: "desc" },
                take: 8,
            });

            const currentTotal = periods.length > 0
                ? (periods as any[]).filter((p: any) => p.period === periods[0]?.period).reduce((s: number, p: any) => s + (p.totalAmount || 0), 0)
                : 0;
            const previousTotal = periods.length > 1
                ? (periods as any[]).filter((p: any) => p.period === periods[1]?.period).reduce((s: number, p: any) => s + (p.totalAmount || 0), 0)
                : 0;
            const periodChange = previousTotal > 0
                ? ((currentTotal - previousTotal) / previousTotal) * 100
                : null;

            return NextResponse.json({
                totalEarned,
                totalStatements,
                latestPeriod,
                topSociety: topSociety ? { name: topSociety[0], amount: topSociety[1] } : null,
                periodChange,
                bySociety: Object.entries(bySociety).map(([name, amount]: [string, any]) => ({ name, amount })),
                recentStatements: statements.slice(0, 10),
            });
        }

        if (view === "by-society") {
            const royaltyPeriods = await db.royaltyPeriod.findMany({
                where: {
                    orgId: orgId!,
                    workId: null,
                    ...(period ? { period } : {}),
                },
                orderBy: { period: "asc" },
            });

            return NextResponse.json(royaltyPeriods);
        }

        if (view === "by-work") {
            const topWorks = await db.statementLine.groupBy({
                by: ["workId", "title"],
                where: {
                    statement: { orgId: orgId! },
                    workId: { not: null },
                    ...(period ? { statement: { orgId: orgId!, period } } : {}),
                },
                _sum: { amount: true, uses: true },
                orderBy: { _sum: { amount: "desc" } },
                take: 25,
            });

            return NextResponse.json(
                topWorks.map((w: any) => ({
                    workId: w.workId,
                    title: w.title,
                    totalAmount: w._sum.amount || 0,
                    totalUses: w._sum.uses || 0,
                }))
            );
        }

        if (view === "trends") {
            const allPeriods = await db.royaltyPeriod.findMany({
                where: {
                    orgId: orgId!,
                    workId: null,
                    ...(society ? { society } : {}),
                },
                orderBy: { period: "asc" },
                select: {
                    period: true,
                    society: true,
                    totalAmount: true,
                    totalUses: true,
                    changePercent: true,
                },
            });

            const periodGroups = allPeriods.reduce((acc: Record<string, any>, p: any) => {
                if (!acc[p.period]) {
                    acc[p.period] = { period: p.period, total: 0, bySociety: {} as Record<string, number> };
                }
                acc[p.period].total += (p.totalAmount || 0);
                acc[p.period].bySociety[p.society] = (p.totalAmount || 0);
                return acc;
            }, {});

            return NextResponse.json(Object.values(periodGroups));
        }

        return apiError("Invalid view parameter", 400);
    } catch (err: any) {
        console.error("Revenue analytics error:", err);
        return apiError(err.message || "Failed to fetch revenue data", 500);
    }
}
