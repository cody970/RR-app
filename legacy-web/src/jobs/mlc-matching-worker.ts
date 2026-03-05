import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { db } from '../lib/db';
import { MLCAutomation, MLCMatchResultData } from '../lib/mlc-automation';
import { notifyOrg } from '../lib/notify';

interface MLCMatchJobData {
    jobId: string;
    orgId: string;
    userId: string;
}

export const processMLCMatchJob = async (job: Job<MLCMatchJobData>) => {
    const { jobId, orgId, userId } = job.data;
    console.log(`Processing MLC match job ${jobId} for org ${orgId}`);

    const automation = new MLCAutomation();

    try {
        // Fetch unmatched works
        const worksToMatch = await db.work.findMany({
            where: {
                orgId,
                registrations: {
                    none: { society: "MLC" }
                }
            },
            take: 50 // Limit per batch for safety
        });

        if (worksToMatch.length === 0) {
            await db.mLCMatchJob.update({
                where: { id: jobId },
                data: { status: "COMPLETED", totalWorks: 0, matchesFound: 0 }
            });
            return;
        }

        // Initialize session (throws if not authenticated)
        await automation.initSession();

        let matchesFound = 0;
        let totalProcessed = 0;

        for (const work of worksToMatch) {
            console.log(`Searching matches for: ${work.title}`);
            const result: MLCMatchResultData = await automation.searchAndMatchRecording(work.title, work.iswc || undefined);

            await db.mLCMatchResult.create({
                data: {
                    jobId,
                    workId: work.id,
                    workTitle: work.title,
                    recordingTitle: result.recordingTitle,
                    recordingArtist: result.recordingArtist,
                    recordingISRC: result.recordingISRC,
                    status: result.status,
                    confidence: result.confidence
                }
            });

            if (result.status === "FOUND") matchesFound++;
            totalProcessed++;

            // Wait slightly longer between complete searches (3-5s)
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
        }

        await db.mLCMatchJob.update({
            where: { id: jobId },
            data: { status: "COMPLETED", totalWorks: totalProcessed, matchesFound }
        });

        await notifyOrg({
            orgId,
            title: "MLC Match Complete",
            message: `Processed ${totalProcessed} works. Found ${matchesFound} potential matches.`,
            type: matchesFound > 0 ? "SUCCESS" : "INFO",
            link: "/dashboard/mlc-matching",
        });

    } catch (error) {
        console.error("MLC matching job failed:", error);
        await db.mLCMatchJob.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                error: error instanceof Error ? error.message : "Internal error"
            }
        });
        throw error;
    } finally {
        await automation.closeSession();
    }
};

const mlcMatchWorker = new Worker<MLCMatchJobData>(
    'mlc-matching-queue',
    processMLCMatchJob,
    {
        connection: redis as any,
        concurrency: 1, // Must be 1 so playwright instances don't clash too heavily on auth
    }
);

mlcMatchWorker.on('completed', job => {
    console.log(`MLC Job ${job.id} completed!`);
});

mlcMatchWorker.on('failed', (job, err) => {
    console.log(`MLC Job ${job?.id} failed with error ${err.message}`);
});

console.log('MLC matching worker started!');
