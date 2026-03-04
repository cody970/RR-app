/**
 * POST /api/catalog-scan — Kick off a new catalog scan
 * GET  /api/catalog-scan — List all scans for the authenticated org
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

const scanQueue = new Queue("catalog-scan-queue", {
    connection: redis as any,
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.orgId;
        const userId = session.user.id;

        // Check for existing active scan
        const activeScan = await db.catalogScan.findFirst({
            where: {
                orgId,
                status: { in: ["PENDING", "SCANNING"] },
            },
        });

        if (activeScan) {
            return NextResponse.json(
                { error: "A scan is already in progress", scanId: activeScan.id },
                { status: 409 }
            );
        }

        // Create scan record
        const scan = await db.catalogScan.create({
            data: { orgId },
        });

        // Queue the scan job
        await scanQueue.add("catalog-scan", {
            scanId: scan.id,
            orgId,
            userId,
        });

        return NextResponse.json({ scanId: scan.id, status: "PENDING" }, { status: 201 });
    } catch (error) {
        console.error("Error starting catalog scan:", error);
        return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scans = await db.catalogScan.findMany({
            where: { orgId: session.user.orgId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { gaps: true } },
            },
        });

        return NextResponse.json({ scans });
    } catch (error) {
        console.error("Error listing catalog scans:", error);
        return NextResponse.json({ error: "Failed to list scans" }, { status: 500 });
    }
}
