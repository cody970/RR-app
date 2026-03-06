import { redis } from "@/lib/infra/redis";

export class RedisCache {
    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
        await redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await redis.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    async delete(key: string): Promise<void> {
        await redis.del(key);
    }

    async clear(): Promise<void> {
        await redis.flushdb();
    }
}

export const globalCache = new RedisCache();
