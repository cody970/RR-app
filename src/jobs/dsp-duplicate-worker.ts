/**
 * DSP Duplicate Profile Worker
 *
 * BullMQ worker that processes DSP duplicate profile scan jobs.
 * Mirrors the existing scan-worker.ts pattern.
 */

import { Worker, Job } from "bullmq";
import { redis } from "@/lib/infra/redis";
import { runDspDuplicateScan } from "@/lib/music/dsp-profile-engine";
import { notifyOrg } from "@/lib/infra/notify";
import { db } from "@/lib/infra/db";

interface DspDuplicateJobData {
    scanId: string;
    orgId: string;
    userId: string;
}

export async function processDspDuplicateJob(job: Job<DspDuplicateJobData>) {
    const { scanId, orgId } = job.data;
    console.log(`[DspDuplicateWorker] Starting scan ${scanId} for org ${orgId}`);

    await runDspDuplicateScan(scanId, orgId);

    // Read final results to build the notification message
    const scan = await db.dspDuplicateScan.findUnique({ where: { id: scanId } });
    if (!scan) return;

    if (scan.status === "COMPLETE") {
        await notifyOrg({
            orgId,
            title: "DSP Duplicate Profile Scan Complete",
            message:
                scan.duplicatesFound > 0
                    ? `Found ${scan.duplicatesFound} potential duplicate artist ${scan.duplicatesFound === 1 ? "profile" : "profiles"} across DSPs. Review them to consolidate your catalog.`
                    : "No duplicate artist profiles detected across your DSP reports.",
            type: scan.duplicatesFound > 0 ? "WARNING" : "SUCCESS",
            link: `/dashboard/dsp-duplicates/${scanId}`,
        });
    } else {
        await notifyOrg({
            orgId,
            title: "DSP Duplicate Profile Scan Failed",
            message: scan.error ?? "An unexpected error occurred during the scan.",
            type: "ERROR",
        });
    }

    console.log(`[DspDuplicateWorker] Scan ${scanId} done — status: ${scan.status}`);
}

const dspDuplicateWorker = new Worker<DspDuplicateJobData>(
    "dsp-duplicate-queue",
    processDspDuplicateJob,
    {
        connection: redis as any,
        concurrency: 2,
    }
);

dspDuplicateWorker.on("completed", (job) => {
    console.log(`[DspDuplicateWorker] Job ${job.id} completed`);
});

dspDuplicateWorker.on("failed", (job, err) => {
    console.error(`[DspDuplicateWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log("DSP Duplicate Profile worker started!");
