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

/** Shape of a finding record passed to upsertFinding / batchUpsertFindings. */
interface FindingData {
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    confidence: number;
    estimatedImpact: number;
    amountOriginal: number;
    currency: string;
    resourceType: string;
    resourceId: string;
    orgId: string;
    status?: string;
    metadataFix?: string | null;
}

/** Normalised work entry used for O(n) duplicate detection. */
type NormalizedWork = { id: string; normalizedTitle: string };

/** Composite key used to identify an existing open finding. */
const findingKey = (type: string, resourceId: string) => `${type}:${resourceId}`;

const upsertFinding = async (data: FindingData) => {
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

/**
 * Batch upsert findings — reduces N sequential DB round trips down to a single
 * findMany + createMany + parallel updates.
 *
 * Returns the number of findings that were created or updated.
 */
const batchUpsertFindings = async (findings: FindingData[]): Promise<number> => {
    if (findings.length === 0) return 0;

    const orgId = findings[0].orgId;

    // Single query to find all existing open findings that match any of the pairs
    const existing = await db.finding.findMany({
        where: {
            orgId,
            status: "OPEN",
            OR: findings.map((f) => ({ type: f.type, resourceId: f.resourceId })),
        },
        select: { id: true, type: true, resourceId: true },
    });

    const existingMap = new Map(
        existing.map((e: { id: string; type: string; resourceId: string }) => [findingKey(e.type, e.resourceId), e.id])
    );

    const toCreate = findings.filter((f) => !existingMap.has(findingKey(f.type, f.resourceId)));
    const toUpdate = findings.filter((f) => existingMap.has(findingKey(f.type, f.resourceId)));

    if (toCreate.length > 0) {
        await db.finding.createMany({ data: toCreate });
    }

    if (toUpdate.length > 0) {
        await Promise.all(
            toUpdate.map((f) => {
                const id = existingMap.get(findingKey(f.type, f.resourceId))!;
                return db.finding.update({
                    where: { id },
                    data: {
                        estimatedImpact: f.estimatedImpact,
                        amountOriginal: f.amountOriginal,
                        confidence: f.confidence,
                        metadataFix: f.metadataFix,
                    },
                });
            })
        );
    }

    return toCreate.length + toUpdate.length;
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
                include: {
                    writers: {
                        select: { splitPercent: true },
                    },
                },
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

        // Pre-compute stripped title map for O(n) duplicate detection.
        // Without this, the inner duplicate-detection loop would be O(n²).
        const strippedTitleMap = new Map<string, NormalizedWork[]>();
        for (const w of works) {
            const norm = w.title.toLowerCase().trim();
            const stripped = norm.replace(/\s*\(.*?\)\s*/g, "").trim();
            const arr = strippedTitleMap.get(stripped) ?? [];
            arr.push({ id: w.id, normalizedTitle: norm });
            strippedTitleMap.set(stripped, arr);
        }

        // Collect all work-level findings for batched DB upsert
        const pendingWorkFindings: FindingData[] = [];

        // Rule 1 (missing ISWC) requires an async enrichment call per work —
        // run all enrichments in parallel to avoid sequential waiting.
        const missingIswcWorks = works.filter((w: any) => !w.iswc);
        const enrichments = await Promise.all(
            missingIswcWorks.map((w: any) => enrichMetadata(w.title, w.iswc))
        );
        missingIswcWorks.forEach((work: any, idx: number) => {
            const enrichment = enrichments[idx];
            const impactUSD = ESTIMATES.MISSING_ISWC_IMPACT_USD;
            pendingWorkFindings.push({
                type: "MISSING_ISWC",
                severity: "MEDIUM",
                confidence: enrichment.matchScore,
                metadataFix: enrichment.suggestions ? JSON.stringify(enrichment.suggestions) : null,
                estimatedImpact: impactUSD,
                amountOriginal: convertFromUSD(impactUSD, currency),
                currency,
                resourceType: "Work",
                resourceId: work.id,
                orgId,
            });
        });

        for (const work of works) {
            // Rule 2: Split Overlap (over 100%)
            let totalSplit = 0;
            for (const writer of work.writers) {
                totalSplit += writer.splitPercent;
            }
            if (totalSplit > 100) {
                const impactUSD = ESTIMATES.SPLIT_OVERLAP_IMPACT_USD;
                pendingWorkFindings.push({
                    type: "SPLIT_OVERLAP",
                    severity: "HIGH",
                    confidence: 100,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Work",
                    resourceId: work.id,
                    orgId,
                });
            }

            // Rule 3: Split Underclaim
            if (work.writers.length > 0 && totalSplit < 100 && totalSplit > 0) {
                const unclaimed = 100 - totalSplit;
                const impactUSD = unclaimed * ESTIMATES.UNCLAIMED_SPLIT_MULTIPLIER;
                pendingWorkFindings.push({
                    type: "SPLIT_UNDERCLAIM",
                    severity: unclaimed > 30 ? "HIGH" : "MEDIUM",
                    confidence: 95,
                    estimatedImpact: impactUSD,
                    amountOriginal: convertFromUSD(impactUSD, currency),
                    currency,
                    resourceType: "Work",
                    resourceId: work.id,
                    orgId,
                });
            }

            // Rule 4: Duplicate Detection — O(1) Map lookup (was O(n) inner loop)
            const normalizedTitle = work.title.toLowerCase().trim();
            const stripped = normalizedTitle.replace(/\s*\(.*?\)\s*/g, "").trim();
            const strippedMatches = strippedTitleMap.get(stripped) ?? [];
            const hasDuplicate = strippedMatches.some(
                (m) => m.id !== work.id && m.normalizedTitle !== normalizedTitle
            );
            if (hasDuplicate) {
                pendingWorkFindings.push({
                    type: "POSSIBLE_DUPLICATE",
                    severity: "LOW",
                    confidence: 75,
                    estimatedImpact: ESTIMATES.DUPLICATE_WORK_IMPACT_USD,
                    amountOriginal: convertFromUSD(ESTIMATES.DUPLICATE_WORK_IMPACT_USD, currency),
                    currency,
                    resourceType: "Work",
                    resourceId: work.id,
                    orgId,
                });
            }
        }

        // Batch-upsert all work-level findings in bulk (replaces N*2 sequential DB calls)
        findingsCount += await batchUpsertFindings(pendingWorkFindings);

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
        // Collect statement findings then batch-upsert in one operation
        const pendingStatementFindings: FindingData[] = [];
        for (const line of statementLines) {
            if (!line.isrc) continue;
            const isrcUpper = line.isrc.toUpperCase();
            if (!catalogISRCs.has(isrcUpper)) {
                const impactUSD = line.amount || 0;
                if (impactUSD > 0) {
                    pendingStatementFindings.push({
                        type: "BLACK_BOX_REVENUE",
                        severity: impactUSD > 100 ? "HIGH" : impactUSD > 20 ? "MEDIUM" : "LOW",
                        confidence: 85,
                        estimatedImpact: impactUSD,
                        amountOriginal: line.amountOriginal || impactUSD,
                        currency: line.currency || currency,
                        resourceType: "StatementLine",
                        resourceId: line.id,
                        orgId,
                    });
                }
            }
        }
        findingsCount += await batchUpsertFindings(pendingStatementFindings);

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
