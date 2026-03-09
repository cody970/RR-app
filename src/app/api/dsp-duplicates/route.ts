/**
 * POST /api/dsp-duplicates — Start a new DSP duplicate profile scan
 * GET  /api/dsp-duplicates — List all scans for the authenticated org
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/get-session";
import { ApiErrors } from "@/lib/api/error-response";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import { Queue } from "bullmq";
import { redis } from "@/lib/infra/redis";

const dspDuplicateQueue = new Queue("dsp-duplicate-queue", {
    connection: redis as any,
});

export async function POST(_req: NextRequest) {
    try {
        const { orgId, userId } = await requireAuth();

        // Prevent concurrent scans
        const activeScan = await db.dspDuplicateScan.findFirst({
            where: { orgId, status: { in: ["PENDING", "SCANNING"] } },
        });

        if (activeScan) {
            return NextResponse.json(
                { error: "A scan is already in progress", scanId: activeScan.id },
                { status: 409 }
            );
        }

        const scan = await db.dspDuplicateScan.create({
            data: { orgId },
        });

        await dspDuplicateQueue.add("dsp-duplicate-scan", {
            scanId: scan.id,
            orgId,
            userId,
        });

        return NextResponse.json({ scanId: scan.id, status: "PENDING" }, { status: 201 });
    } catch (error) {
        if (error instanceof AuthError) {
            return error.status === 403 ? ApiErrors.Forbidden() : ApiErrors.Unauthorized();
        }
        logger.error({ err: error }, "dsp_duplicates_api: failed to start scan");
        return ApiErrors.Internal();
    }
}

export async function GET(_req: NextRequest) {
    try {
        const { orgId } = await requireAuth();

        const scans = await db.dspDuplicateScan.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { groups: true } },
            },
        });

        return NextResponse.json({ scans });
    } catch (error) {
        if (error instanceof AuthError) {
            return error.status === 403 ? ApiErrors.Forbidden() : ApiErrors.Unauthorized();
        }
        logger.error({ err: error }, "dsp_duplicates_api: failed to list scans");
        return ApiErrors.Internal();
    }
}
