import { redis } from './redis';

export interface RateLimitOptions {
    key: string;
    limit: number;
    windowMs: number;
}

export async function checkRateLimit(options: RateLimitOptions) {
    const { key, limit, windowMs } = options;

    const count = await redis.incr(key);
    if (count === 1) {
        await redis.pexpire(key, windowMs);
    }

    if (count > limit) {
        return { success: false, count, limit };
    }

    return { success: true, count, limit };
}
