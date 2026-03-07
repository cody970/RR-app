import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { checkRateLimit } from "@/lib/infra/rate-limit";
import { validatePermission } from "@/lib/auth/rbac";
import { createEvidenceHash } from "@/lib/infra/hash";
import { auditQueue } from "@/lib/infra/queue";
import { requireAuth, AuthError } from "@/lib/auth/get-session";
import { executeInTransaction } from "@/lib/infra/db-connection";
import { DistributedLock } from "@/lib/infra/retry";
import { asyncLogger } from "@/lib/infra/logger-async";
import { redis } from "@/lib/infra/redis";

export async function POST() {
    const correlationId = crypto.randomUUID();
    
    try {
        const { userId, orgId, role } = await requireAuth();

        asyncLogger.info('Audit job request received', { 
            correlationId, 
            orgId, 
            userId 
        });

        // 1. RBAC Check
        try {
            validatePermission(role, "AUDIT_RUN");
        } catch (e: any) {
            asyncLogger.warn('RBAC check failed', { 
                correlationId, 
                orgId, 
                userId, 
                error: e.message 
            });
            return new NextResponse(e.message, { status: 403 });
        }

        // 2. Rate Limiting with enhanced error handling
        const limitCheck = await checkRateLimit({
            key: `audit_${orgId}`,
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });

        if (!limitCheck.success) {
            asyncLogger.warn('Rate limit exceeded', { 
                correlationId, 
                orgId, 
                limitCheck 
            });
            return new NextResponse(
                `Too Many Requests - Audit Rate Limit Exceeded. Retry after ${limitCheck.retryAfter} seconds`, 
                { 
                    status: 429,
                    headers: {
                        'Retry-After': limitCheck.retryAfter?.toString() || '900'
                    }
                }
            );
        }

        // 3. Recovery Logic: Check for stuck jobs (> 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        try {
            const stuckJob = await db.auditJob.findFirst({
                where: {
                    orgId,
                    status: "PROCESSING",
                    updatedAt: { lt: fiveMinsAgo }
                }
            });

            if (stuckJob) {
                asyncLogger.warn('Found stuck audit job', { 
                    correlationId, 
                    orgId, 
                    jobId: stuckJob.id 
                });
                
                await db.auditJob.update({
                    where: { id: stuckJob.id },
                    data: { status: "FAILED", error: "Job timed out" }
                });
            }
        } catch (error) {
            asyncLogger.error('Failed to check for stuck jobs', error as Error, { 
                correlationId, 
                orgId 
            });
        }

        // 4. Use distributed lock to prevent concurrent audit creation
        const lock = new DistributedLock(redis, 10000);
        const lockKey = `audit_lock_${orgId}`;
        
        let job;
        try {
            job = await lock.withLock(
                lockKey,
                async () => {
                    // Double-check for active jobs within the lock
                    const activeJob = await db.auditJob.findFirst({
                        where: {
                            orgId,
                            status: "PROCESSING"
                        }
                    });

                    if (activeJob) {
                        asyncLogger.warn('Concurrent audit job detected', { 
                            correlationId, 
                            orgId, 
                            activeJobId: activeJob.id 
                        });
                        throw new Error("CONCURRENT_AUDIT");
                    }

                    // Create a new background job using transaction
                    return await executeInTransaction(
                        async (tx) => {
                            const newJob = await tx.auditJob.create({
                                data: {
                                    orgId,
                                    status: "PROCESSING"
                                }
                            });

                            // Get the last audit log hash for hash-chaining
                            const lastLog = await tx.auditLog.findFirst({
                                where: { orgId },
                                orderBy: { timestamp: "desc" },
                                select: { evidenceHash: true }
                            });

                            // Audit Log: Started (with SHA-256)
                            const startDetails = JSON.stringify({ 
                                jobId: newJob.id, 
                                triggeredBy: userId 
                            });
                            
                            await tx.auditLog.create({
                                data: {
                                    action: "AUDIT_JOB_STARTED",
                                    details: startDetails,
                                    evidenceHash: createEvidenceHash(startDetails, lastLog?.evidenceHash),
                                    orgId,
                                    userId
                                }
                            });

                            return newJob;
                        },
                        { maxRetries: 3, timeout: 10000 }
                    );
                }
            );
        } catch (error) {
            if ((error as Error).message === "CONCURRENT_AUDIT") {
                return new NextResponse(
                    "An audit is already in progress", 
                    { status: 409 }
                );
            }
            throw error;
        }

        // 5. Background audit process with error handling
        try {
            await auditQueue.add('run-audit', {
                jobId: job.id,
                orgId,
                userId
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 3600, // Keep completed jobs for 1 hour
                    count: 10, // Keep last 10 completed jobs
                },
                removeOnFail: {
                    age: 86400, // Keep failed jobs for 24 hours
                },
            });
            
            asyncLogger.info('Audit job queued successfully', { 
                correlationId, 
                orgId, 
                jobId: job.id 
            });
        } catch (error) {
            asyncLogger.error('Failed to queue audit job', error as Error, { 
                correlationId, 
                orgId, 
                jobId: job.id 
            });
            
            // Update job status to failed
            await db.auditJob.update({
                where: { id: job.id },
                data: { 
                    status: "FAILED", 
                    error: "Failed to queue job for processing" 
                }
            });
            
            throw error;
        }

        return NextResponse.json({ 
            jobId: job.id, 
            status: job.status,
            correlationId 
        });
    } catch (err: any) {
        asyncLogger.error('Audit job creation failed', err, { 
            correlationId, 
            orgId 
        });
        
        if (err instanceof AuthError) {
            return new NextResponse(err.message, { status: err.status });
        }
        return new NextResponse(
            err.message || "Internal error", 
            { status: 500 }
        );
    }
}
