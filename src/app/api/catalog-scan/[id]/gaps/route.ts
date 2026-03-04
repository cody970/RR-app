/**
 * GET   /api/catalog-scan/:id/gaps — Paginated, filterable list of registration gaps
 * PATCH /api/catalog-scan/:id/gaps — Batch update gap statuses
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

        // Verify scan belongs to the org
        const scan = await db.catalogScan.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });
        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        // Parse query params
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
        const gapType = url.searchParams.get("gapType");
        const society = url.searchParams.get("society");
        const status = url.searchParams.get("status");
        const sortBy = url.searchParams.get("sortBy") || "estimatedImpact";
        const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

        // Build filter
        const where: Record<string, unknown> = { scanId: params.id };
        if (gapType) where.gapType = gapType;
        if (society) where.society = society;
        if (status) where.status = status;

        const [gaps, total] = await Promise.all([
            db.registrationGap.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            db.registrationGap.count({ where }),
        ]);

        return NextResponse.json({
            gaps,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching gaps:", error);
        return NextResponse.json({ error: "Failed to fetch gaps" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scan = await db.catalogScan.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });
        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        const body = await req.json();
        const { gapIds, status: newStatus } = body as {
            gapIds: string[];
            status: string;
        };

        if (!gapIds?.length || !newStatus) {
            return NextResponse.json(
                { error: "gapIds and status are required" },
                { status: 400 }
            );
        }

        const validStatuses = ["OPEN", "REGISTERING", "REGISTERED", "DISMISSED"];
        if (!validStatuses.includes(newStatus)) {
            return NextResponse.json(
                { error: `status must be one of: ${validStatuses.join(", ")}` },
                { status: 400 }
            );
        }

        const result = await db.registrationGap.updateMany({
            where: {
                id: { in: gapIds },
                scanId: params.id,
            },
            data: { status: newStatus },
        });

        return NextResponse.json({ updated: result.count });
    } catch (error) {
        console.error("Error updating gaps:", error);
        return NextResponse.json({ error: "Failed to update gaps" }, { status: 500 });
    }
}
