import { Queue } from 'bullmq';
import { redis } from "@/lib/infra/redis";

export const auditQueue = new Queue('audit-queue', {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
    },
});

export const contentIdQueue = new Queue('content-id-queue', {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});

export const exchangeRateQueue = new Queue('exchange-rate-queue', {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
    },
});
