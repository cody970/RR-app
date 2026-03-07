/**
 * Content ID Monitoring Worker
 *
 * BullMQ worker that periodically checks recordings against Content ID platforms
 * to detect unregistered usage and track revenue.
 */

import { Worker, Job } from "bullmq";
import { redis } from "@/lib/infra/redis";
import { db } from "@/lib/infra/db";
import { HaawkClient } from "@/lib/clients/haawk-client";
import { notifyOrg } from "@/lib/infra/notify";

// ---------- Job Types ----------

interface ContentIdJobData {
    jobId: string;
    orgId: string;
    userId?: string;
    // Optional: specific recording IDs to check (if empty, checks all)
    recordingIds?: string[];
}

// ---------- Job Processor ----------

export async function processContentIdJob(job: Job<ContentIdJobData>) {
    const { jobId, orgId, recordingIds } = job.data;
    console.log(`[ContentIdWorker] Starting job ${jobId} for org ${orgId}`);

    try {
        // Update job status
        await db.contentIdJob.update({
            where: { id: jobId },
            data: { 
                status: "RUNNING",
                startedAt: new Date(),
            },
        });

        const client = new HaawkClient();
        let monitorsChecked = 0;
        let newUsagesFound = 0;
        let totalEstimatedRevenue = 0;

        // Get monitors to check
        const whereClause: any = {
            orgId,
            registrationStatus: "REGISTERED",
        };
        
        if (recordingIds && recordingIds.length > 0) {
            whereClause.recordingId = { in: recordingIds };
        }

        const monitors = await db.contentIdMonitor.findMany({
            where: whereClause,
            include: {
                recording: {
                    select: {
                        id: true,
                        title: true,
                        isrc: true,
                    }
                }
            }
        });

        const totalRecordings = monitors.length;
        await db.contentIdJob.update({
            where: { id: jobId },
            data: { totalRecordings },
        });

        // Process each monitor
        for (const monitor of monitors) {
            try {
                // Report progress
                await job.updateProgress({
                    processed: monitorsChecked,
                    total: totalRecordings,
                    newUsages: newUsagesFound,
                });

                // Check for new usages
                const report = await client.checkForUsages(monitor.id);
                
                monitorsChecked++;
                newUsagesFound += report.newUsages.length;
                totalEstimatedRevenue += report.estimatedRevenue;

                // If new usages found, create findings for significant detections
                if (report.newUsages.length > 0) {
                    for (const usage of report.newUsages) {
                        // Create a finding for detected usage (can be used for revenue tracking)
                        if (usage.estimatedRevenue > 5) { // Only for significant usages
                            const existingFinding = await db.finding.findFirst({
                                where: {
                                    orgId,
                                    type: "CONTENT_ID_USAGE_DETECTED",
                                    resourceId: monitor.recordingId,
                                    status: "OPEN",
                                }
                            });

                            if (!existingFinding) {
                                await db.finding.create({
                                    data: {
                                        type: "CONTENT_ID_USAGE_DETECTED",
                                        severity: "INFO",
                                        status: "OPEN",
                                        confidence: 90,
                                        estimatedImpact: usage.estimatedRevenue,
                                        resourceType: "Recording",
                                        resourceId: monitor.recordingId,
                                        orgId,
                                        metadataFix: JSON.stringify({
                                            platform: usage.platform,
                                            videoId: usage.videoId,
                                            channelName: usage.channelName,
                                        }),
                                    }
                                });
                            }
                        }
                    }
                }

                // Update job progress
                await db.contentIdJob.update({
                    where: { id: jobId },
                    data: {
                        processedCount: monitorsChecked,
                        newUsagesFound,
                        estimatedRevenue: totalEstimatedRevenue,
                    },
                });

            } catch (error) {
                console.error(`[ContentIdWorker] Error checking monitor ${monitor.id}:`, error);
                // Continue processing other monitors
            }
        }

        // Check for unregistered recordings and create findings
        const unregisteredRecordings = await client.getUnregisteredRecordings(orgId);
        
        for (const unregistered of unregisteredRecordings) {
            // Create or update finding for unregistered recording
            const existingFinding = await db.finding.findFirst({
                where: {
                    orgId,
                    type: "CONTENT_ID_UNREGISTERED",
                    resourceId: unregistered.id,
                    status: "OPEN",
                }
            });

            if (!existingFinding && unregistered.missedPlatforms.length === 4) {
                // Only create finding if completely unregistered
                await db.finding.create({
                    data: {
                        type: "CONTENT_ID_UNREGISTERED",
                        severity: "MEDIUM",
                        status: "OPEN",
                        confidence: 85,
                        estimatedImpact: unregistered.estimatedMissedRevenue,
                        resourceType: "Recording",
                        resourceId: unregistered.id,
                        orgId,
                        metadataFix: JSON.stringify({
                            missedPlatforms: unregistered.missedPlatforms,
                        }),
                    }
                });
            }
        }

        // Mark job as complete
        await db.contentIdJob.update({
            where: { id: jobId },
            data: {
                status: "COMPLETE",
                completedAt: new Date(),
                processedCount: monitorsChecked,
                newUsagesFound,
                estimatedRevenue: totalEstimatedRevenue,
            },
        });

        // Notify the organization
        await notifyOrg({
            orgId,
            title: "Content ID Scan Complete",
            message: newUsagesFound > 0
                ? `Found ${newUsagesFound} new Content ID usage${newUsagesFound !== 1 ? "s" : ""} with estimated revenue of $${totalEstimatedRevenue.toFixed(2)}.`
                : `Scanned ${monitorsChecked} monitor${monitorsChecked !== 1 ? "s" : ""}. No new usages detected.`,
            type: newUsagesFound > 0 ? "SUCCESS" : "INFO",
            link: "/dashboard/content-id",
        });

        console.log(
            `[ContentIdWorker] Job ${jobId} complete. Checked ${monitorsChecked} monitors, found ${newUsagesFound} new usages.`
        );

        return {
            monitorsChecked,
            newUsagesFound,
            totalEstimatedRevenue,
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ContentIdWorker] Job ${jobId} failed:`, message);

        await db.contentIdJob.update({
            where: { id: jobId },
            data: { 
                status: "FAILED", 
                error: message,
                completedAt: new Date(),
            },
        });

        await notifyOrg({
            orgId,
            title: "Content ID Scan Failed",
            message: `Scan encountered an error: ${message}`,
            type: "ERROR",
        });

        throw error;
    }
}

// ---------- Worker Instance ----------

const contentIdWorker = new Worker<ContentIdJobData>(
    "content-id-queue",
    processContentIdJob,
    {
        connection: redis as any,
        concurrency: 2, // Process 2 jobs at a time
    }
);

contentIdWorker.on("completed", (job) => {
    console.log(`[ContentIdWorker] Job ${job.id} completed!`);
});

contentIdWorker.on("failed", (job, err) => {
    console.log(`[ContentIdWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log("Content ID worker started!");
