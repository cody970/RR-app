import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { globalCache } from "@/lib/infra/cache";
import { convertFromUSD } from "@/lib/finance/currency";
import { ApiErrors } from "@/lib/api/error-response";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return ApiErrors.Unauthorized();
        const orgId = session.user.orgId;

        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        // Get organization base currency
        const org = await db.organization.findUnique({
            where: { id: orgId },
            select: { currency: true }
        });
        const currency = org?.currency || "USD";

        const cacheKey = `analytics:${orgId}:${currency}`;
        const cachedData = await globalCache.get(cacheKey);
        if (cachedData) {
            return NextResponse.json(cachedData);
        }

        // 1. Catalog Health Metrics
        const [workCount, recordsCount, worksWithIswc, recordsWithIsrc] = await Promise.all([
            db.work.count({ where: { orgId } }),
            db.recording.count({ where: { orgId } }),
            db.work.count({ where: { orgId, NOT: { iswc: null } } }),
            db.recording.count({ where: { orgId, NOT: { isrc: null } } }),
        ]);

        const totalItems = workCount + recordsCount;
        const itemsWithId = worksWithIswc + recordsWithIsrc;
        const healthScore = totalItems > 0 ? Math.round((itemsWithId / totalItems) * 100) : 100;

        // 2. Finding Impact Metrics — use DB-level aggregation to avoid loading all
        //    findings into memory (avoids O(N) memory for large catalogs).
        const [findingTotals, impactByTypeRaw, severityRaw, statusRaw] = await Promise.all([
            db.finding.aggregate({
                where: { orgId },
                _sum: { estimatedImpact: true, recoveredAmount: true },
            }),
            db.finding.groupBy({
                by: ["type"],
                where: { orgId },
                _sum: { estimatedImpact: true },
            }),
            db.finding.groupBy({
                by: ["severity"],
                where: { orgId },
                _count: { _all: true },
            }),
            db.finding.groupBy({
                by: ["status"],
                where: { orgId },
                _count: { _all: true },
            }),
        ]);

        const totalLeakage = Number(findingTotals._sum.estimatedImpact ?? 0);
        const totalRecovered = Number(findingTotals._sum.recoveredAmount ?? 0);
        const recoveryRate = totalLeakage > 0 ? (totalRecovered / totalLeakage) * 100 : 0;

        const chartData = impactByTypeRaw.map(r => ({
            name: r.type.replace(/_/g, " "),
            value: Number(r._sum.estimatedImpact ?? 0),
        }));

        const severityData = Object.fromEntries(
            severityRaw.map(r => [r.severity, r._count._all])
        );

        const statusData = Object.fromEntries(
            statusRaw.map(r => [r.status, r._count._all])
        );

        const result = {
            healthScore,
            totalItems,
            itemsWithId,
            totalLeakage: convertFromUSD(totalLeakage, currency),
            totalRecovered: convertFromUSD(totalRecovered, currency),
            recoveryRate,
            currency,
            chartData: chartData.map(c => ({ ...c, value: convertFromUSD(c.value as number, currency) })),
            severityData,
            statusData,
        };

        await globalCache.set(cacheKey, result, 300000); // 5 min cache

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Stats API error:", error);
        return ApiErrors.Internal(error?.message || "Internal Server Error");
    }
}
