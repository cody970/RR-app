/**
 * Content ID Scan API
 *
 * POST /api/content-id/scan — Start a new Content ID monitoring scan job
 * GET  /api/content-id/scan — Get status of recent scan jobs
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { contentIdQueue } from "@/lib/infra/queue";
import { z } from "zod";

// ---------- GET — List scan jobs ----------

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const orgId = session.user.orgId;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    try {
        const jobs = await db.contentIdJob.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return NextResponse.json({ jobs });
    } catch (error: unknown) {
        console.error("Content ID scan jobs error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ---------- POST — Start scan job ----------

const scanSchema = z.object({
    recordingIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "CATALOG_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const parsed = scanSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const orgId = session.user.orgId;
        const userId = session.user.id;
        const { recordingIds } = parsed.data;

        // Check for existing running job
        const existingJob = await db.contentIdJob.findFirst({
            where: {
                orgId,
                status: { in: ["PENDING", "RUNNING"] },
            },
        });

        if (existingJob) {
            return NextResponse.json(
                { error: "A scan is already in progress", jobId: existingJob.id },
                { status: 409 },
            );
        }

        // Create the job record
        const job = await db.contentIdJob.create({
            data: {
                orgId,
                status: "PENDING",
            },
        });

        // Queue the job
        await contentIdQueue.add(
            "content-id-scan",
            {
                jobId: job.id,
                orgId,
                userId,
                recordingIds,
            },
            {
                jobId: job.id,
            }
        );

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: "Content ID scan job started",
        });

    } catch (error: unknown) {
        console.error("Content ID scan start error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
