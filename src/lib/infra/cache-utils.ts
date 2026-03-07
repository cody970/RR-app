import { redis } from "@/lib/redis";

export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    try {
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached) as T;
        }
    } catch (error) {
        console.warn(`[Cache] Error reading key "${key}":`, error);
    }

    const data = await fetcher();

    try {
        await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch (error) {
        console.warn(`[Cache] Error writing key "${key}":`, error);
    }

    return data;
}

export function generateCacheKey(prefix: string, identifiers: Record<string, string | number | undefined>) {
    const parts = Object.entries(identifiers)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}:${v}`)
        .join(":");
    return `${prefix}:${parts}`;
}
