/**
 * GET /api/dsp-duplicates/[scanId] — Fetch duplicate groups for a completed scan
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(
    req: NextRequest,
    { params }: { params: { scanId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { scanId } = params;
        const orgId = session.user.orgId;

        // Verify the scan belongs to this org
        const scan = await db.dspDuplicateScan.findFirst({
            where: { id: scanId, orgId },
        });

        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        const url = new URL(req.url);
        const statusFilter = url.searchParams.get("status");

        const groups = await db.dspDuplicateGroup.findMany({
            where: {
                scanId,
                ...(statusFilter ? { status: statusFilter } : {}),
            },
            orderBy: { totalStreams: "desc" },
        });

        return NextResponse.json({ scan, groups });
    } catch (error) {
        console.error("Error fetching DSP duplicate scan:", error);
        return NextResponse.json({ error: "Failed to fetch scan results" }, { status: 500 });
    }
}

/**
 * PATCH /api/dsp-duplicates/[scanId] — Update status of a duplicate group
 * Body: { groupId: string, status: "REVIEWED" | "RESOLVED" }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { scanId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { scanId } = params;
        const orgId = session.user.orgId;

        // Verify ownership
        const scan = await db.dspDuplicateScan.findFirst({
            where: { id: scanId, orgId },
        });
        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        const body = await req.json();
        const { groupId, status } = body as { groupId: string; status: string };

        if (!groupId || !["REVIEWED", "RESOLVED"].includes(status)) {
            return NextResponse.json(
                { error: "groupId and a valid status (REVIEWED | RESOLVED) are required" },
                { status: 400 }
            );
        }

        const updated = await db.dspDuplicateGroup.updateMany({
            where: { id: groupId, scanId },
            data: { status },
        });

        if (updated.count === 0) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating duplicate group:", error);
        return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }
}
