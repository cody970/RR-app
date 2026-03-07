/**
 * Redis Cache Layer with Circuit Breaker
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
 * - Circuit breaker pattern for fault tolerance
 */

import Redis from 'ioredis';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../infra/circuit-breaker';

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
  circuitBreakerTrips: number;
}

// Cache configuration
const DEFAULT_TTL = 3600; // 1 hour
const KEY_PREFIX = 'rr:';

// Redis client (lazy initialization)
let redisClient: Redis | null = null;
let redisAvailable = false;

// Circuit breaker for Redis
let redisCircuitBreaker = createCircuitBreaker('redis-cache', {
  failureThreshold: 5,
  timeout: 60000, // 1 minute
  successThreshold: 2,
  onStateChange: (state) => {
    if (state === 'OPEN') {
      console.warn('[Redis] Circuit breaker tripped - switching to in-memory cache only');
      redisAvailable = false;
    } else if (state === 'CLOSED') {
      console.log('[Redis] Circuit breaker closed - Redis available again');
      redisAvailable = true;
    }
  },
});

// Cache statistics
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  circuitBreakerTrips: 0,
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
      stats.errors++;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
      redisAvailable = true;
    });

    // Test connection through circuit breaker
    await redisCircuitBreaker.execute(async () => {
      await redisClient!.ping();
    });
    
    redisAvailable = true;
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
    redisAvailable = false;
    stats.errors++;
  }
}

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  const cacheKey = `${KEY_PREFIX}${key}`;
  
  try {
    if (redisAvailable && redisClient) {
      const value = await redisCircuitBreaker.execute(async () => {
        return await redisClient!.get(cacheKey);
      });
      
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
    if (error instanceof CircuitBreakerOpenError) {
      stats.circuitBreakerTrips++;
      // Fallback to memory cache
      const entry = memoryCache.get(cacheKey);
      if (entry && entry.expiresAt > Date.now()) {
        stats.hits++;
        return entry.value;
      }
    } else {
      console.error('[Redis] Get error:', error);
      stats.errors++;
    }
    
    stats.misses++;
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
      await redisCircuitBreaker.execute(async () => {
        await redisClient!.setex(cacheKey, ttl, serialized);
      });
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
    if (error instanceof CircuitBreakerOpenError) {
      stats.circuitBreakerTrips++;
      // Fallback to memory cache
      memoryCache.set(cacheKey, { value, expiresAt });
      if (memoryCache.size > 1000) {
        cleanExpiredMemoryEntries();
      }
    } else {
      console.error('[Redis] Set error:', error);
      stats.errors++;
      // Fallback to memory cache
      memoryCache.set(cacheKey, { value, expiresAt });
    }
  }
}

/**
 * Delete value from cache
 */
export async function del(key: string): Promise<void> {
  const cacheKey = `${KEY_PREFIX}${key}`;
  
  try {
    if (redisAvailable && redisClient) {
      await redisCircuitBreaker.execute(async () => {
        await redisClient!.del(cacheKey);
      });
    } else {
      memoryCache.delete(cacheKey);
    }
    
    stats.deletes++;
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      stats.circuitBreakerTrips++;
      memoryCache.delete(cacheKey);
    } else {
      console.error('[Redis] Delete error:', error);
      stats.errors++;
      memoryCache.delete(cacheKey);
    }
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function delPattern(pattern: string): Promise<void> {
  const fullPattern = `${KEY_PREFIX}${pattern}`;
  
  try {
    if (redisAvailable && redisClient) {
      const keys = await redisCircuitBreaker.execute(async () => {
        return await redisClient!.keys(fullPattern);
      });
      
      if (keys.length > 0) {
        await redisCircuitBreaker.execute(async () => {
          await redisClient!.del(...keys);
        });
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
    if (error instanceof CircuitBreakerOpenError) {
      stats.circuitBreakerTrips++;
      // Delete from memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    } else {
      console.error('[Redis] Delete pattern error:', error);
      stats.errors++;
      // Delete from memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
        }
      }
    }
  }
}

/**
 * Clear all cache
 */
export async function clear(): Promise<void> {
  try {
    if (redisAvailable && redisClient) {
      const keys = await redisCircuitBreaker.execute(async () => {
        return await redisClient!.keys(`${KEY_PREFIX}*`);
      });
      
      if (keys.length > 0) {
        await redisCircuitBreaker.execute(async () => {
          await redisClient!.del(...keys);
        });
      }
    } else {
      memoryCache.clear();
    }
    
    console.log('[Redis] Cache cleared');
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      stats.circuitBreakerTrips++;
      memoryCache.clear();
    } else {
      console.error('[Redis] Clear error:', error);
      stats.errors++;
      memoryCache.clear();
    }
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
  stats.circuitBreakerTrips = 0;
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats() {
  return redisCircuitBreaker.getStats();
}

/**
 * Reset circuit breaker
 */
export function resetCircuitBreaker(): void {
  redisCircuitBreaker.reset();
  redisAvailable = true;
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

/**
 * Check if circuit breaker is open
 */
export function isCircuitBreakerOpen(): boolean {
  return redisCircuitBreaker.isOpen();
}

// Auto-initialize Redis on module load
if (typeof window === 'undefined') {
  initRedis().catch(console.error);
}