import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePermission } from "@/lib/rbac";
import { createEvidenceHash } from "@/lib/hash";
import { auditQueue } from "@/lib/queue";
import { requireAuth, AuthError } from "@/lib/get-session";

export async function POST() {
    try {
        const { userId, orgId, role } = await requireAuth();

        // 1. RBAC Check
        try {
            validatePermission(role, "AUDIT_RUN");
        } catch (e: any) {
            return new NextResponse(e.message, { status: 403 });
        }

        // 2. Rate Limiting
        const limitCheck = await checkRateLimit({
            key: `audit_${orgId}`,
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });

        if (!limitCheck.success) {
            return new NextResponse("Too Many Requests - Audit Rate Limit Exceeded", { status: 429 });
        }

        // Recovery Logic: Check for stuck jobs (> 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const stuckJob = await db.auditJob.findFirst({
            where: {
                orgId,
                status: "PROCESSING",
                updatedAt: { lt: fiveMinsAgo }
            }
        });

        if (stuckJob) {
            await db.auditJob.update({
                where: { id: stuckJob.id },
                data: { status: "FAILED", error: "Job timed out" }
            });
        }

        // Prevent concurrent active jobs
        const activeJob = await db.auditJob.findFirst({
            where: {
                orgId,
                status: "PROCESSING"
            }
        });

        if (activeJob) {
            return new NextResponse("An audit is already in progress", { status: 409 });
        }

        // Create a new background job
        const job = await db.auditJob.create({
            data: {
                orgId,
                status: "PROCESSING"
            }
        });

        // Get the last audit log hash for hash-chaining
        const lastLog = await db.auditLog.findFirst({
            where: { orgId },
            orderBy: { timestamp: "desc" },
            select: { evidenceHash: true }
        });

        // Audit Log: Started (with SHA-256)
        const startDetails = JSON.stringify({ jobId: job.id, triggeredBy: userId });
        await db.auditLog.create({
            data: {
                action: "AUDIT_JOB_STARTED",
                details: startDetails,
                evidenceHash: createEvidenceHash(startDetails, lastLog?.evidenceHash),
                orgId,
                userId
            }
        });

        // Background audit process
        await auditQueue.add('run-audit', {
            jobId: job.id,
            orgId,
            userId
        });

        return NextResponse.json({ jobId: job.id, status: job.status });
    } catch (err: any) {
        if (err instanceof AuthError) {
            return new NextResponse(err.message, { status: err.status });
        }
        return new NextResponse(err.message || "Internal error", { status: 500 });
    }
}
