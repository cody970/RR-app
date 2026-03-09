import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const globalForRedis = global as unknown as {
    redis: Redis | undefined;
};

function createRedisClient(): Redis {
    if (!redisUrl) {
        // Return a client that won't endlessly retry when no Redis is configured
        const client = new Redis({
            lazyConnect: true,
            maxRetriesPerRequest: null,
            retryStrategy: () => null, // Don't retry — Redis is intentionally disabled
            enableOfflineQueue: false,
        });
        // Suppress connection error noise when Redis is not configured
        client.on('error', () => {});
        return client;
    }

    const client = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Required by bullmq
    });
    return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
