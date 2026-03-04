/**
 * GET /api/catalog-scan/:id — Get scan details with gap summary
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scan = await db.catalogScan.findFirst({
            where: {
                id: params.id,
                orgId: session.user.orgId,
            },
            include: {
                _count: { select: { gaps: true } },
            },
        });

        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        // Get gap type distribution
        const gapsByType = await db.registrationGap.groupBy({
            by: ["gapType"],
            where: { scanId: scan.id },
            _count: true,
        });

        // Get gap society distribution
        const gapsBySociety = await db.registrationGap.groupBy({
            by: ["society"],
            where: { scanId: scan.id },
            _count: true,
        });

        // Get total estimated impact
        const impactAgg = await db.registrationGap.aggregate({
            where: { scanId: scan.id },
            _sum: { estimatedImpact: true },
        });

        return NextResponse.json({
            scan,
            summary: {
                gapsByType: gapsByType.map((g) => ({
                    type: g.gapType,
                    count: g._count,
                })),
                gapsBySociety: gapsBySociety.map((g) => ({
                    society: g.society,
                    count: g._count,
                })),
                totalEstimatedImpact: impactAgg._sum.estimatedImpact || 0,
            },
        });
    } catch (error) {
        console.error("Error fetching scan details:", error);
        return NextResponse.json({ error: "Failed to fetch scan" }, { status: 500 });
    }
}
