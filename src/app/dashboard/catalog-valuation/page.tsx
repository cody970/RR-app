import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { CatalogValuationClient } from "./client";

export default async function CatalogValuationPage() {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.orgId;

    if (!orgId) return null;

    const [workCount, recordingCount, statements] = await Promise.all([
        db.work.count({ where: { orgId } }),
        db.recording.count({ where: { orgId } }),
        db.statement.findMany({
            where: { orgId, status: "PROCESSED" },
            select: { id: true, totalAmount: true },
        }),
    ]);

    // Sum all statement amounts as a proxy for annual revenue
    const totalRevenue = statements.reduce(
        (sum, s) => sum + s.totalAmount.toNumber(),
        0
    );

    const statementIds = statements.map((s) => s.id);

    // Fetch top works by aggregated statement line income
    const topWorkLines = statementIds.length > 0
        ? await db.statementLine.groupBy({
            by: ["workId"],
            where: { statementId: { in: statementIds }, workId: { not: null } },
            _sum: { amount: true },
            orderBy: { _sum: { amount: "desc" } },
            take: 10,
        })
        : [];

    const workIds = topWorkLines
        .map((r) => r.workId)
        .filter((id): id is string => id !== null);

    const works = workIds.length > 0
        ? await db.work.findMany({
            where: { id: { in: workIds }, orgId },
            select: { id: true, title: true },
        })
        : [];

    const workMap = new Map(works.map((w) => [w.id, w.title]));

    const topWorks = topWorkLines
        .filter((r) => r.workId && workMap.has(r.workId))
        .map((r) => ({
            title: workMap.get(r.workId!)!,
            annualRevenue: r._sum.amount ? r._sum.amount.toNumber() : 0,
        }));

    return (
        <CatalogValuationClient
            workCount={workCount}
            recordingCount={recordingCount}
            annualRevenue={totalRevenue}
            topWorks={topWorks}
        />
    );
}
