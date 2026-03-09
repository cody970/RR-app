/**
 * POST /api/dsp-duplicates — Start a new DSP duplicate profile scan
 * GET  /api/dsp-duplicates — List all scans for the authenticated org
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { Queue } from "bullmq";
import { redis } from "@/lib/infra/redis";

const dspDuplicateQueue = new Queue("dsp-duplicate-queue", {
    connection: redis as any,
});

export async function POST(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.orgId;
        const userId = session.user.id;

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
        console.error("Error starting DSP duplicate scan:", error);
        return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scans = await db.dspDuplicateScan.findMany({
            where: { orgId: session.user.orgId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { groups: true } },
            },
        });

        return NextResponse.json({ scans });
    } catch (error) {
        console.error("Error listing DSP duplicate scans:", error);
        return NextResponse.json({ error: "Failed to list scans" }, { status: 500 });
    }
}
