import { redis } from "@/lib/infra/redis";
import { withRetry, DistributedLock } from "./retry";
import { asyncLogger } from "./logger-async";

export interface RateLimitOptions {
    key: string;
    limit: number;
    windowMs: number;
}

export interface RateLimitResult {
    success: boolean;
    count: number;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, windowMs } = options;

    try {
        // Use retry logic for Redis operations
        return await withRetry(
            async () => {
                // Atomic increment + expire via pipeline to prevent TOCTOU race
                const pipeline = redis.multi();
                pipeline.incr(key);
                pipeline.pexpire(key, windowMs);
                const results = await pipeline.exec();

                if (!results) {
                    throw new Error('Redis pipeline returned no results');
                }

                // results[0] = [err, count] from INCR
                const incrResult = results[0];
                if (incrResult[0]) {
                    throw new Error(`Redis INCR failed: ${incrResult[0]}`);
                }

                const count = (incrResult[1] as number) ?? 0;
                const now = Date.now();
                const resetAt = now + windowMs;

                if (count > limit) {
                    // Calculate retry after time
                    const ttl = await redis.pttl(key);
                    const retryAfter = ttl > 0 ? Math.ceil(ttl / 1000) : windowMs / 1000;
                    
                    asyncLogger.warn(
                        'Rate limit exceeded',
                        { key, count, limit, retryAfter }
                    );
                    
                    return { 
                        success: false, 
                        count, 
                        limit, 
                        remaining: 0, 
                        resetAt,
                        retryAfter 
                    };
                }

                return { 
                    success: true, 
                    count, 
                    limit, 
                    remaining: Math.max(0, limit - count), 
                    resetAt 
                };
            },
            {
                maxAttempts: 3,
                initialDelay: 100,
                maxDelay: 1000,
                retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'EPIPE'],
                onRetry: (attempt, error) => {
                    asyncLogger.warn(
                        `Rate limit check retry attempt ${attempt}`,
                        { key, error: error.message }
                    );
                }
            }
        );
    } catch (error) {
        asyncLogger.error(
            'Rate limit check failed',
            error as Error,
            { key, limit }
        );
        
        // Fail open - allow request if rate limiting fails
        return { 
            success: true, 
            count: 0, 
            limit, 
            remaining: limit, 
            resetAt: Date.now() + windowMs 
        };
    }
}

/**
 * Advanced Rate Limiter with Sliding Window
 * 
 * Provides more accurate rate limiting using sliding window algorithm
 */
export class SlidingWindowRateLimiter {
    constructor(
        private redis: any,
        private windowSize: number, // in milliseconds
        private maxRequests: number
    ) {}

    async check(key: string): Promise<RateLimitResult> {
        const now = Date.now();
        const windowStart = now - this.windowSize;
        const memberKey = `${key}:members`;

        try {
            return await withRetry(
                async () => {
                    const pipeline = this.redis.multi();
                    
                    // Remove old entries outside the window
                    pipeline.zremrangebyscore(memberKey, 0, windowStart);
                    
                    // Count current requests
                    pipeline.zcard(memberKey);
                    
                    // Add current request
                    pipeline.zadd(memberKey, now, `${now}-${Math.random()}`);
                    
                    // Set expiration
                    pipeline.expire(memberKey, Math.ceil(this.windowSize / 1000));
                    
                    const results = await pipeline.exec();

                    if (!results) {
                        throw new Error('Redis pipeline returned no results');
                    }

                    const count = (results[1][1] as number) ?? 0;
                    const resetAt = now + this.windowSize;

                    if (count > this.maxRequests) {
                        // Remove the current request since it's over limit
                        await this.redis.zremrangebyscore(memberKey, now, now + 1);
                        
                        const retryAfter = Math.ceil(this.windowSize / 1000);
                        
                        asyncLogger.warn(
                            'Sliding window rate limit exceeded',
                            { key, count, limit: this.maxRequests, retryAfter }
                        );
                        
                        return { 
                            success: false, 
                            count, 
                            limit: this.maxRequests, 
                            remaining: 0, 
                            resetAt,
                            retryAfter 
                        };
                    }

                    return { 
                        success: true, 
                        count, 
                        limit: this.maxRequests, 
                        remaining: Math.max(0, this.maxRequests - count), 
                        resetAt 
                    };
                },
                {
                    maxAttempts: 3,
                    initialDelay: 100,
                    maxDelay: 1000,
                }
            );
        } catch (error) {
            asyncLogger.error(
                'Sliding window rate limit check failed',
                error as Error,
                { key, maxRequests: this.maxRequests }
            );
            
            // Fail open
            return { 
                success: true, 
                count: 0, 
                limit: this.maxRequests, 
                remaining: this.maxRequests, 
                resetAt: now + this.windowSize 
            };
        }
    }
}

/**
 * Rate Limit with Distributed Locking
 * 
 * Ensures that concurrent requests don't bypass rate limits
 */
export async function checkRateLimitWithLock(
    options: RateLimitOptions
): Promise<RateLimitResult> {
    const { key, limit, windowMs } = options;
    const lockKey = `ratelimit:lock:${key}`;

    try {
        const lock = new DistributedLock(new Redis(process.env.REDIS_URL));
        
        return await lock.withLock(
            lockKey,
            async () => {
                return await checkRateLimit(options);
            },
            1000 // 1 second lock TTL
        );
    } catch (error) {
        asyncLogger.error(
            'Rate limit with lock failed',
            error as Error,
            { key, limit }
        );
        
        // If we can't get the lock, fail open
        return { 
            success: true, 
            count: 0, 
            limit, 
            remaining: limit, 
            resetAt: Date.now() + windowMs 
        };
    }
}
