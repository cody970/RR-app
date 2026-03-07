/**
 * Catalog Scan Worker
 *
 * BullMQ worker that processes catalog scan jobs in the background.
 * Mirrors the existing audit-worker.ts pattern.
 */

import { Worker, Job } from "bullmq";
import { redis } from "@/lib/infra/redis";
import { db } from "@/lib/infra/db";
import { runCatalogScan } from "@/lib/music/catalog-scanner";
import { notifyOrg } from "@/lib/infra/notify";
import {
    publishScanProgress,
    publishScanCompleted,
    publishScanFailed,
} from "@/lib/infra/event-bus";

interface ScanJobData {
    scanId: string;
    orgId: string;
    userId: string;
}

export async function processScanJob(job: Job<ScanJobData>) {
    const { scanId, orgId, userId } = job.data;
    console.log(`[ScanWorker] Starting catalog scan ${scanId} for org ${orgId}`);

    try {
        // Update scan status
        await db.catalogScan.update({
            where: { id: scanId },
            data: { status: "SCANNING" },
        });

        // Run the scan with progress reporting
        const result = await runCatalogScan(scanId, orgId, async (progress) => {
            await job.updateProgress({
                scanned: progress.scannedItems,
                total: progress.totalItems,
                gaps: progress.gapsFound,
            });

            // Publish real-time progress event via Redis Pub/Sub
            await publishScanProgress(
                orgId,
                scanId,
                progress.scannedItems,
                progress.totalItems,
                progress.gapsFound
            );

            // Update scan record periodically
            await db.catalogScan.update({
                where: { id: scanId },
                data: {
                    scannedCount: progress.scannedItems,
                    unregisteredCount: progress.gapsFound,
                },
            });
        });

        // Publish scan completed event via Redis Pub/Sub
        await publishScanCompleted(orgId, scanId, result.totalGaps);

        // Notify the user
        await notifyOrg({
            orgId,
            title: "Catalog Scan Complete",
            message: `Found ${result.totalGaps} unregistered catalog ${result.totalGaps === 1 ? "item" : "items"}. Review the results to claim missing royalties.`,
            type: result.totalGaps > 0 ? "WARNING" : "SUCCESS",
            link: `/dashboard/catalog-scan/${scanId}`,
        });

        console.log(
            `[ScanWorker] Scan ${scanId} complete. Found ${result.totalGaps} gaps.`
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ScanWorker] Scan ${scanId} failed:`, message);

        // Publish scan failed event via Redis Pub/Sub
        await publishScanFailed(orgId, scanId, message);

        await db.catalogScan.update({
            where: { id: scanId },
            data: { status: "FAILED", error: message },
        });

        await notifyOrg({
            orgId,
            title: "Catalog Scan Failed",
            message: `Scan encountered an error: ${message}`,
            type: "ERROR",
        });

        throw error;
    }
}

const scanWorker = new Worker<ScanJobData>(
    "catalog-scan-queue",
    processScanJob,
    {
        connection: redis as any,
        concurrency: 2,
    }
);

scanWorker.on("completed", (job) => {
    console.log(`[ScanWorker] Job ${job.id} completed!`);
});

scanWorker.on("failed", (job, err) => {
    console.log(`[ScanWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log("Catalog scan worker started!");
