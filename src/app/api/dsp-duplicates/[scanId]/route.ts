/**
 * GET   /api/dsp-duplicates/[scanId] — Fetch duplicate groups for a completed scan
 * PATCH /api/dsp-duplicates/[scanId] — Update status of a duplicate group
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/get-session";
import { ApiErrors } from "@/lib/api/error-response";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";

export async function GET(
    req: NextRequest,
    { params }: { params: { scanId: string } }
) {
    try {
        const { orgId } = await requireAuth();
        const { scanId } = params;

        // Verify the scan belongs to this org
        const scan = await db.dspDuplicateScan.findFirst({
            where: { id: scanId, orgId },
        });

        if (!scan) {
            return ApiErrors.NotFound("Scan not found");
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
        if (error instanceof AuthError) {
            return error.status === 403 ? ApiErrors.Forbidden() : ApiErrors.Unauthorized();
        }
        logger.error({ err: error, scanId: params.scanId }, "dsp_duplicates_api: failed to fetch scan");
        return ApiErrors.Internal();
    }
}

/**
 * Body: { groupId: string, status: "REVIEWED" | "RESOLVED" }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { scanId: string } }
) {
    try {
        const { orgId } = await requireAuth();
        const { scanId } = params;

        // Verify ownership
        const scan = await db.dspDuplicateScan.findFirst({
            where: { id: scanId, orgId },
        });
        if (!scan) {
            return ApiErrors.NotFound("Scan not found");
        }

        const body = await req.json();
        const { groupId, status } = body as { groupId: string; status: string };

        if (!groupId || !["REVIEWED", "RESOLVED"].includes(status)) {
            return ApiErrors.BadRequest(
                "groupId and a valid status (REVIEWED | RESOLVED) are required"
            );
        }

        const updated = await db.dspDuplicateGroup.updateMany({
            where: { id: groupId, scanId },
            data: { status },
        });

        if (updated.count === 0) {
            return ApiErrors.NotFound("Group not found");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return error.status === 403 ? ApiErrors.Forbidden() : ApiErrors.Unauthorized();
        }
        logger.error({ err: error, scanId: params.scanId }, "dsp_duplicates_api: failed to update group");
        return ApiErrors.Internal();
    }
}
