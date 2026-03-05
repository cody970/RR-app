import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { db } from '../lib/db';
import { enrichMetadata } from '../lib/enrichment';
import { convertFromUSD } from '../lib/currency';
import { createEvidenceHash } from '../lib/hash';
import { notifyOrg } from '../lib/notify';

interface AuditJobData {
    jobId: string;
    orgId: string;
    userId: string;
}

export const processAuditJob = async (job: Job<AuditJobData>) => {
    const { jobId, orgId, userId } = job.data;
    console.log(`Processing audit job ${jobId} for org ${orgId}`);

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
        const catalogTitles = new Map<string, string>(); // normalized title -> work id
        for (const w of works) {
            catalogTitles.set(w.title.toLowerCase().trim(), w.id);
        }

        // ── WORK-LEVEL RULES ──
        for (const work of works) {
            // Rule 1: Missing ISWC
            if (!work.iswc) {
                const enrichment = await enrichMetadata(work.title, work.iswc);
                const impactUSD = 15.50;
                await db.finding.create({
                    data: {
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
                    }
                });
                findingsCount++;
            }

            // Rule 2: Split Overlap (over 100%)
            let totalSplit = 0;
            for (const writer of work.writers) {
                totalSplit += writer.splitPercent;
            }
            if (totalSplit > 100) {
                const impactUSD = 250.00;
                await db.finding.create({
                    data: {
                        type: "SPLIT_OVERLAP",
                        severity: "HIGH",
                        confidence: 100,
                        estimatedImpact: impactUSD,
                        amountOriginal: convertFromUSD(impactUSD, currency),
                        currency,
                        resourceType: "Work",
                        resourceId: work.id,
                        orgId
                    }
                });
                findingsCount++;
            }

            // Rule 3: Split Underclaim (under 100% — leaving money on the table)
            if (work.writers.length > 0 && totalSplit < 100 && totalSplit > 0) {
                const unclaimed = 100 - totalSplit;
                const impactUSD = unclaimed * 5; // Estimate based on unclaimed percentage
                await db.finding.create({
                    data: {
                        type: "SPLIT_UNDERCLAIM",
                        severity: unclaimed > 30 ? "HIGH" : "MEDIUM",
                        confidence: 95,
                        estimatedImpact: impactUSD,
                        amountOriginal: convertFromUSD(impactUSD, currency),
                        currency,
                        resourceType: "Work",
                        resourceId: work.id,
                        orgId
                    }
                });
                findingsCount++;
            }

            // Rule 4: Duplicate Detection (fuzzy title matching)
            const normalizedTitle = work.title.toLowerCase().trim();
            const variations = [
                normalizedTitle.replace(/\s*\(.*?\)\s*/g, "").trim(), // Remove parenthetical
                normalizedTitle.replace(/[^a-z0-9\s]/g, "").trim(),   // Remove punctuation
                normalizedTitle.replace(/\s+/g, " ").trim(),          // Normalize whitespace
            ];

            for (const otherWork of works) {
                if (otherWork.id === work.id) continue;
                const otherNorm = otherWork.title.toLowerCase().trim();
                const otherStripped = otherNorm.replace(/\s*\(.*?\)\s*/g, "").trim();

                if (variations[0] === otherStripped && normalizedTitle !== otherNorm) {
                    await db.finding.create({
                        data: {
                            type: "POSSIBLE_DUPLICATE",
                            severity: "LOW",
                            confidence: 75,
                            estimatedImpact: 10.00,
                            amountOriginal: convertFromUSD(10.00, currency),
                            currency,
                            resourceType: "Work",
                            resourceId: work.id,
                            orgId
                        }
                    });
                    findingsCount++;
                    break; // Only flag once per work
                }
            }
        }

        // ── RECORDING-LEVEL RULES ──
        for (const rec of recordings) {
            // Rule 5: Missing ISRC
            if (!rec.isrc) {
                const enrichment = await enrichMetadata(rec.title, rec.isrc);
                const impactUSD = 45.00;
                await db.finding.create({
                    data: {
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
                    }
                });
                findingsCount++;
            }

            // Rule 6: Unlinked Recording
            if (!rec.workId) {
                const impactUSD = 25.00;
                await db.finding.create({
                    data: {
                        type: "UNLINKED_RECORDING",
                        severity: "MEDIUM",
                        confidence: 90,
                        estimatedImpact: impactUSD,
                        amountOriginal: convertFromUSD(impactUSD, currency),
                        currency,
                        resourceType: "Recording",
                        resourceId: rec.id,
                        orgId
                    }
                });
                findingsCount++;
            }
        }

        // ── STATEMENT-LEVEL RULES (Black Box Detection) ──
        for (const line of statementLines) {
            if (!line.isrc) continue;
            const isrcUpper = line.isrc.toUpperCase();
            if (!catalogISRCs.has(isrcUpper)) {
                // This is unclaimed revenue — no catalog entry matches this ISRC
                const impactUSD = line.amount || 0;
                if (impactUSD > 0) {
                    await db.finding.create({
                        data: {
                            type: "BLACK_BOX_REVENUE",
                            severity: impactUSD > 100 ? "HIGH" : impactUSD > 20 ? "MEDIUM" : "LOW",
                            confidence: 85,
                            estimatedImpact: impactUSD,
                            amountOriginal: line.amountOriginal || impactUSD,
                            currency: line.currency || currency,
                            resourceType: "StatementLine",
                            resourceId: line.id,
                            orgId
                        }
                    });
                    findingsCount++;
                }
            }
        }

        // Update job status
        await db.auditJob.update({
            where: { id: jobId },
            data: {
                status: "COMPLETED",
                findingsCount
            }
        });

        // Audit Log: Completion (with SHA-256 hash chain)
        const lastLogAfter = await db.auditLog.findFirst({
            where: { orgId },
            orderBy: { timestamp: "desc" },
            select: { evidenceHash: true }
        });
        const completeDetails = JSON.stringify({ jobId: jobId, findingsFound: findingsCount });
        await db.auditLog.create({
            data: {
                action: "AUDIT_JOB_COMPLETED",
                details: completeDetails,
                evidenceHash: createEvidenceHash(completeDetails, lastLogAfter?.evidenceHash),
                orgId,
                userId
            }
        });

        // Send notification to all org users
        await notifyOrg({
            orgId,
            title: "Audit Complete",
            message: `Audit finished with ${findingsCount} finding${findingsCount !== 1 ? "s" : ""} detected.`,
            type: findingsCount > 0 ? "WARNING" : "SUCCESS",
            link: "/dashboard/audit",
        });

    } catch (error) {
        console.error("Audit background job failed:", error);
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
    console.log(`Job ${job.id} completed!`);
});

auditWorker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} failed with error ${err.message}`);
});

console.log('Audit worker started!');

