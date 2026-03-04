import { Queue } from 'bullmq';
import { redis } from './redis';

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
