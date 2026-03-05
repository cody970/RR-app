import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;

        const { searchParams } = new URL(req.url);
        const view = searchParams.get("view") || "summary"; // summary | by-society | by-work | trends
        const period = searchParams.get("period"); // optional filter
        const society = searchParams.get("society"); // optional filter

        // ---------- Summary ----------
        if (view === "summary") {
            const statements = await db.statement.findMany({
                where: { orgId },
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

            const totalEarned = statements.reduce((s, st) => s + st.totalAmount, 0);
            const totalStatements = statements.length;
            const latestPeriod = statements[0]?.period || "N/A";

            // Society breakdown
            const bySociety = statements.reduce((acc, st) => {
                acc[st.source] = (acc[st.source] || 0) + st.totalAmount;
                return acc;
            }, {} as Record<string, number>);

            const topSociety = Object.entries(bySociety).sort((a, b) => b[1] - a[1])[0];

            // Period-over-period change
            const periods = await db.royaltyPeriod.findMany({
                where: { orgId, workId: null },
                orderBy: { period: "desc" },
                take: 8,
            });

            const currentTotal = periods.length > 0
                ? periods.filter(p => p.period === periods[0]?.period).reduce((s, p) => s + p.totalAmount, 0)
                : 0;
            const previousTotal = periods.length > 1
                ? periods.filter(p => p.period === periods[1]?.period).reduce((s, p) => s + p.totalAmount, 0)
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
                bySociety: Object.entries(bySociety).map(([name, amount]) => ({ name, amount })),
                recentStatements: statements.slice(0, 10),
            });
        }

        // ---------- By Society ----------
        if (view === "by-society") {
            const royaltyPeriods = await db.royaltyPeriod.findMany({
                where: {
                    orgId,
                    workId: null,
                    ...(period ? { period } : {}),
                },
                orderBy: { period: "asc" },
            });

            return NextResponse.json(royaltyPeriods);
        }

        // ---------- By Work ----------
        if (view === "by-work") {
            const topWorks = await db.statementLine.groupBy({
                by: ["workId", "title"],
                where: {
                    statement: { orgId },
                    workId: { not: null },
                    ...(period ? { statement: { orgId, period } } : {}),
                },
                _sum: { amount: true, uses: true },
                orderBy: { _sum: { amount: "desc" } },
                take: 25,
            });

            return NextResponse.json(
                topWorks.map(w => ({
                    workId: w.workId,
                    title: w.title,
                    totalAmount: w._sum.amount || 0,
                    totalUses: w._sum.uses || 0,
                }))
            );
        }

        // ---------- Trends ----------
        if (view === "trends") {
            const allPeriods = await db.royaltyPeriod.findMany({
                where: {
                    orgId,
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

            // Group by period for chart data
            const periodGroups = allPeriods.reduce((acc, p) => {
                if (!acc[p.period]) {
                    acc[p.period] = { period: p.period, total: 0, bySociety: {} as Record<string, number> };
                }
                acc[p.period].total += p.totalAmount;
                acc[p.period].bySociety[p.society] = p.totalAmount;
                return acc;
            }, {} as Record<string, { period: string; total: number; bySociety: Record<string, number> }>);

            return NextResponse.json(Object.values(periodGroups));
        }

        return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
    } catch (err: any) {
        console.error("Revenue analytics error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
