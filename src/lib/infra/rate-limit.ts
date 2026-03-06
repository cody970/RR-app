import { redis } from "@/lib/infra/redis";

export interface RateLimitOptions {
    key: string;
    limit: number;
    windowMs: number;
}

export async function checkRateLimit(options: RateLimitOptions) {
    const { key, limit, windowMs } = options;

    // Atomic increment + expire via pipeline to prevent TOCTOU race
    const pipeline = redis.multi();
    pipeline.incr(key);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();

    // results[0] = [err, count] from INCR
    const count = (results?.[0]?.[1] as number) ?? 0;

    if (count > limit) {
        return { success: false, count, limit };
    }

    return { success: true, count, limit };
}
