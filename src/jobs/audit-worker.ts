import { Worker, Job } from 'bullmq';
import { redis } from '@/lib/infra/redis';
import { db } from '@/lib/infra/db';
import { logger } from '@/lib/infra/logger';
import { enrichMetadata } from '@/lib/music/enrichment';
import { convertFromUSD } from '@/lib/finance/currency';
import { createEvidenceHash } from '@/lib/infra/hash';
import { ESTIMATES } from '@/lib/music/constants';
import { notifyOrg } from '@/lib/infra/notify';
import { pMap } from "@/lib/infra/utils";
import { searchByISRC } from "@/lib/clients/songview-client";

interface AuditJobData {
    jobId: string;
    orgId: string;
    userId: string;
}

const upsertFinding = async (data: any) => {
    const existing = await db.finding.findFirst({
        where: {
            orgId: data.orgId,
            type: data.type,
            resourceId: data.resourceId,
            status: "OPEN"
        }
    });

    if (existing) {
        return db.finding.update({
            where: { id: existing.id },
            data: {
                estimatedImpact: data.estimatedImpact,
                amountOriginal: data.amountOriginal,
                confidence: data.confidence,
                metadataFix: data.metadataFix
            }
        });
    }

    return db.finding.create({ data });
};

export const processAuditJob = async (job: Job<AuditJobData>) => {
    const { jobId, orgId, userId } = job.data;
    logger.info({ jobId, orgId }, `Processing audit job ${jobId} for org ${orgId}`);

    try {
        // Get organization base currency
        const org = await db.organization.findUnique({
            where: { id: orgId },
            select: { currency: true }
        });
        const currency = org?.currency || "USD";

        // Fetch all data for analysis
        const [works, recordings, statementLines] = await Promise.all([
            db.work.findMany({
                where: { orgId },
                include: { writers: true }
            }),
            db.recording.findMany({ where: { orgId } }),
            db.statementLine.findMany({
                where: {
                    statement: { orgId }
                },
                include: { statement: true }
            })
        ]);

        let findingsCount = 0;

        // Build lookup sets for cross-referencing
        const catalogISRCs = new Set(recordings.filter((r: any) => r.isrc).map((r: any) => r.isrc!.toUpperCase()));

        // ── WORK-LEVEL RULES ──
        for (const work of works) {
            // Rule 1: Missing ISWC
            if (!work.iswc) {
                const enrichment = await enrichMetadata(work.title, work.iswc);
                const impactUSD = ESTIMATES.MISSING_ISWC_IMPACT_USD;
                await upsertFinding({
                    type: "MISSING_ISWC",
                    severity: "MEDIUM",
                    confidence: enrichment.matchScore,
                    metadataFix: enrichment.suggestions ? JSON.stringify(enrichment.suggestions) : null,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Work",
                    resourceId: work.id,
                    orgId
                });
                findingsCount++;
            }

            // Rule 2: Split Overlap (over 100%)
            let totalSplit = 0;
            for (const writer of work.writers) {
                totalSplit += writer.splitPercent;
            }
            if (totalSplit > 100) {
                const impactUSD = ESTIMATES.SPLIT_OVERLAP_IMPACT_USD;
                await upsertFinding({
                    type: "SPLIT_OVERLAP",
                    severity: "HIGH",
                    confidence: 100,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Work",
                    resourceId: work.id,
                    orgId
                });
                findingsCount++;
            }

            // Rule 3: Split Underclaim
            if (work.writers.length > 0 && totalSplit < 100 && totalSplit > 0) {
                const unclaimed = 100 - totalSplit;
                const impactUSD = unclaimed * ESTIMATES.UNCLAIMED_SPLIT_MULTIPLIER;
                await upsertFinding({
                    type: "SPLIT_UNDERCLAIM",
                    severity: unclaimed > 30 ? "HIGH" : "MEDIUM",
                    confidence: 95,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Work",
                    resourceId: work.id,
                    orgId
                });
                findingsCount++;
            }

            // Rule 4: Duplicate Detection
            const normalizedTitle = work.title.toLowerCase().trim();
            const variations = [
                normalizedTitle.replace(/\s*\(.*?\)\s*/g, "").trim(),
                normalizedTitle.replace(/[^a-z0-9\s]/g, "").trim(),
                normalizedTitle.replace(/\s+/g, " ").trim(),
            ];

            for (const otherWork of works) {
                if (otherWork.id === work.id) continue;
                const otherNorm = otherWork.title.toLowerCase().trim();
                const otherStripped = otherNorm.replace(/\s*\(.*?\)\s*/g, "").trim();

                if (variations[0] === otherStripped && normalizedTitle !== otherNorm) {
                    await upsertFinding({
                        type: "POSSIBLE_DUPLICATE",
                        severity: "LOW",
                        confidence: 75,
                        estimatedImpact: ESTIMATES.DUPLICATE_WORK_IMPACT_USD,
                        amountOriginal: convertFromUSD(ESTIMATES.DUPLICATE_WORK_IMPACT_USD, currency),
                        currency,
                        resourceType: "Work",
                        resourceId: work.id,
                        orgId
                    });
                    findingsCount++;
                    break;
                }
            }
        }

        // ── RECORDING-LEVEL RULES ──
        // Process recordings in parallel with concurrency control
        const recordingGaps = await pMap(recordings, async (rec: any) => {
            let localFindings = 0;

            // Rule 5: Missing ISRC
            if (!rec.isrc) {
                const enrichment = await enrichMetadata(rec.title, rec.isrc);
                const impactUSD = ESTIMATES.MISSING_ISRC_IMPACT_USD;
                await upsertFinding({
                    type: "MISSING_ISRC",
                    severity: "HIGH",
                    confidence: enrichment.matchScore,
                    metadataFix: enrichment.suggestions ? JSON.stringify(enrichment.suggestions) : null,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Recording",
                    resourceId: rec.id,
                    orgId
                });
                localFindings++;
            } else {
                const songviewResult = await searchByISRC(rec.isrc!);
                if (!songviewResult.found) {
                    const impactUSD = ESTIMATES.UNREGISTERED_RECORDING_IMPACT_USD;
                    await upsertFinding({
                        type: "UNREGISTERED_RECORDING",
                        severity: "MEDIUM",
                        confidence: 90,
                        estimatedImpact: impactUSD,
                        amountOriginal: convertFromUSD(impactUSD, currency),
                        currency,
                        resourceType: "Recording",
                        resourceId: rec.id,
                        orgId
                    });
                    localFindings++;
                }

                if (songviewResult.found && (songviewResult.shares || 0) > 100.1) {
                    const impactUSD = ESTIMATES.SPLIT_OVERLAP_IMPACT_USD;
                    await upsertFinding({
                        type: "SPLIT_CONFLICT",
                        severity: "HIGH",
                        confidence: 85,
                        estimatedImpact: impactUSD,
                        amountOriginal: convertFromUSD(impactUSD, currency),
                        currency,
                        resourceType: "Recording",
                        resourceId: rec.id,
                        orgId
                    });
                    localFindings++;
                }

                if (songviewResult.found && !songviewResult.iswc) {
                    const impactUSD = ESTIMATES.MISSING_ISWC_IMPACT_USD;
                    await upsertFinding({
                        type: "MISSING_ISWC",
                        severity: "LOW",
                        confidence: 95,
                        estimatedImpact: impactUSD,
                        amountOriginal: convertFromUSD(impactUSD, currency),
                        currency,
                        resourceType: "Recording",
                        resourceId: rec.id,
                        orgId
                    });
                    localFindings++;
                }
            }

            if (!rec.workId) {
                const impactUSD = ESTIMATES.UNLINKED_RECORDING_IMPACT_USD;
                await upsertFinding({
                    type: "UNLINKED_RECORDING",
                    severity: "MEDIUM",
                    confidence: 90,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Recording",
                    resourceId: rec.id,
                    orgId
                });
                localFindings++;
            }
            return localFindings;
        }, 10);

        findingsCount += recordingGaps.reduce((sum, count) => sum + count, 0);

        // ── STATEMENT-LEVEL RULES ──
        for (const line of statementLines) {
            if (!line.isrc) continue;
            const isrcUpper = line.isrc.toUpperCase();
            if (!catalogISRCs.has(isrcUpper)) {
                const impactUSD = line.amount || 0;
                if (impactUSD > 0) {
                    await upsertFinding({
                        type: "BLACK_BOX_REVENUE",
                        severity: impactUSD > 100 ? "HIGH" : impactUSD > 20 ? "MEDIUM" : "LOW",
                        confidence: 85,
                        estimatedImpact: impactUSD,
                        amountOriginal: line.amountOriginal || impactUSD,
                        currency: line.currency || currency,
                        resourceType: "StatementLine",
                        resourceId: line.id,
                        orgId
                    });
                    findingsCount++;
                }
            }
        }

        // ── DISTRIBUTOR LEAKAGE DETECTION ──
        const { detectDistributorLeaks } = await import('../lib/reports/import-discrepancy-engine');
        const leakResult = await detectDistributorLeaks(orgId);
        if (leakResult?.success && leakResult.finding) {
            findingsCount++;
        }

        // Update job status
        await db.auditJob.update({
            where: { id: jobId },
            data: {
                status: "COMPLETED",
                findingsCount
            }
        });

        // Audit Log: Completion
        const lastLogAfter = await db.auditLog.findFirst({
            where: { orgId },
            orderBy: { timestamp: "desc" },
            select: { evidenceHash: true }
        });
        const completeDetails = JSON.stringify({ jobId, findingsFound: findingsCount });
        await db.auditLog.create({
            data: {
                action: "AUDIT_JOB_COMPLETED",
                details: completeDetails,
                evidenceHash: createEvidenceHash(completeDetails, lastLogAfter?.evidenceHash),
                orgId,
                userId
            }
        });

        // Send notification
        await notifyOrg({
            orgId,
            title: "Audit Complete",
            message: `Audit finished with ${findingsCount} finding${findingsCount !== 1 ? "s" : ""} detected.`,
            type: findingsCount > 0 ? "WARNING" : "SUCCESS",
            link: "/dashboard/audit",
        });

    } catch (error) {
        logger.error({ err: error, jobId, orgId }, "Audit background job failed");
        await db.auditJob.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                error: error instanceof Error ? error.message : "Internal error"
            }
        });
        throw error;
    }
};

const auditWorker = new Worker<AuditJobData>(
    'audit-queue',
    processAuditJob,
    {
        connection: redis as any,
        concurrency: 5,
    }
);

auditWorker.on('completed', job => {
    logger.info({ jobId: job.id }, `Job ${job.id} completed!`);
});

auditWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, `Job ${job?.id} failed with error ${err.message}`);
});

logger.info('Audit worker started!');
