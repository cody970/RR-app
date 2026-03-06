import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { globalCache } from "@/lib/infra/cache";
import { convertFromUSD, formatCurrency } from "@/lib/finance/currency";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

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

        // 2. Finding Impact Metrics
        const findings = await db.finding.findMany({
            where: { orgId },
            select: { type: true, estimatedImpact: true, severity: true, status: true, recoveredAmount: true },
        });

        const totalLeakage = findings.reduce((acc, f) => acc + (f.estimatedImpact || 0), 0);
        const totalRecovered = findings.reduce((acc, f) => acc + (f.recoveredAmount || 0), 0);
        const recoveryRate = totalLeakage > 0 ? (totalRecovered / totalLeakage) * 100 : 0;

        const impactByType = findings.reduce((acc: any, f) => {
            acc[f.type] = (acc[f.type] || 0) + (f.estimatedImpact || 0);
            return acc;
        }, {});

        const chartData = Object.entries(impactByType).map(([name, value]) => ({
            name: name.replace(/_/g, " "),
            value,
        }));

        // 3. Severity & Status Distribution
        const severityData = findings.reduce((acc: any, f) => {
            acc[f.severity] = (acc[f.severity] || 0) + 1;
            return acc;
        }, {});

        const statusData = findings.reduce((acc: any, f) => {
            acc[f.status] = (acc[f.status] || 0) + 1;
            return acc;
        }, {});

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
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
