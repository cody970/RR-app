/**
 * Redis Cache Layer
 * 
 * Provides caching for frequently accessed data:
 * - Society lookups
 * - Work data
 * - Validation results
 * 
 * Features:
 * - Automatic cache expiration (TTL)
 * - Cache invalidation on data updates
 * - Performance monitoring
 * - Fallback to in-memory cache if Redis unavailable
 */

import Redis from 'ioredis';

// Types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 3600 = 1 hour)
  prefix?: string; // Key prefix (default: 'rr:')
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

// Cache configuration
const DEFAULT_TTL = 3600; // 1 hour
const KEY_PREFIX = 'rr:';

// Redis client (lazy initialization)
let redisClient: Redis | null = null;
let redisAvailable = false;

// Cache statistics
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

// In-memory fallback cache
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('[Redis] REDIS_URL not configured, using in-memory cache only');
      redisAvailable = false;
      return;
    }

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      console.error('[Redis] Error:', error);
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
      redisAvailable = true;
    });

    // Test connection
    await redisClient.ping();
    redisAvailable = true;
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
    redisAvailable = false;
  }
}

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  const cacheKey = `${KEY_PREFIX}${key}`;
  
  try {
    if (redisAvailable && redisClient) {
      const value = await redisClient.get(cacheKey);
      if (value) {
        stats.hits++;
        return JSON.parse(value);
      }
    } else {
      // Fallback to memory cache
      const entry = memoryCache.get(cacheKey);
      if (entry && entry.expiresAt > Date.now()) {
        stats.hits++;
        return entry.value;
      }
    }
    
    stats.misses++;
    return null;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    stats.errors++;
    return null;
  }
}

/**
 * Set value in cache
 */
export async function set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
  const cacheKey = `${KEY_PREFIX}${key}`;
  const ttl = options.ttl ?? DEFAULT_TTL;
  const expiresAt = Date.now() + (ttl * 1000);
  
  try {
    const serialized = JSON.stringify(value);
    
    if (redisAvailable && redisClient) {
      await redisClient.setex(cacheKey, ttl, serialized);
    } else {
      // Fallback to memory cache
      memoryCache.set(cacheKey, { value, expiresAt });
      // Clean up expired entries periodically
      if (memoryCache.size > 1000) {
        cleanExpiredMemoryEntries();
      }
    }
    
    stats.sets++;
  } catch (error) {
    console.error('[Redis] Set error:', error);
    stats.errors++;
  }
}

/**
 * Delete value from cache
 */
export async function del(key: string): Promise<void> {
  const cacheKey = `${KEY_PREFIX}${key}`;
  
  try {
    if (redisAvailable && redisClient) {
      await redisClient.del(cacheKey);
    } else {
      memoryCache.delete(cacheKey);
    }
    
    stats.deletes++;
  } catch (error) {
    console.error('[Redis] Delete error:', error);
    stats.errors++;
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function delPattern(pattern: string): Promise<void> {
  const fullPattern = `${KEY_PREFIX}${pattern}`;
  
  try {
    if (redisAvailable && redisClient) {
      const keys = await redisClient.keys(fullPattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      // Delete matching keys from memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    }
    
    stats.deletes += 1;
  } catch (error) {
    console.error('[Redis] Delete pattern error:', error);
    stats.errors++;
  }
}

/**
 * Clear all cache
 */
export async function clear(): Promise<void> {
  try {
    if (redisAvailable && redisClient) {
      const keys = await redisClient.keys(`${KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      memoryCache.clear();
    }
    
    console.log('[Redis] Cache cleared');
  } catch (error) {
    console.error('[Redis] Clear error:', error);
    stats.errors++;
  }
}

/**
 * Get cache statistics
 */
export function getStats(): CacheStats {
  return { ...stats };
}

/**
 * Reset cache statistics
 */
export function resetStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.errors = 0;
}

/**
 * Clean expired entries from memory cache
 */
function cleanExpiredMemoryEntries(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

// Auto-initialize Redis on module load
if (typeof window === 'undefined') {
  initRedis().catch(console.error);
}