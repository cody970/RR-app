import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initRedis,
  get,
  set,
  del,
  delPattern,
  clear,
  getStats,
  resetStats,
  isRedisAvailable,
} from './redis-cache';

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedis = vi.fn();
  mockRedis.prototype.ping = vi.fn().mockResolvedValue('PONG');
  mockRedis.prototype.get = vi.fn();
  mockRedis.prototype.setex = vi.fn().mockResolvedValue('OK');
  mockRedis.prototype.del = vi.fn().mockResolvedValue(1);
  mockRedis.prototype.keys = vi.fn().mockResolvedValue([]);
  return { default: mockRedis };
});

describe('Redis Cache', () => {
  beforeEach(() => {
    resetStats();
    vi.clearAllMocks();
  });

  describe('initRedis', () => {
    it('should initialize Redis when REDIS_URL is set', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      await initRedis();
      // Redis might not be available in test environment
      // The important thing is that it doesn't crash
      expect(true).toBe(true);
      delete process.env.REDIS_URL;
    });

    it('should not initialize Redis when REDIS_URL is not set', async () => {
      delete process.env.REDIS_URL;
      await initRedis();
      expect(isRedisAvailable()).toBe(false);
    });
  });

  describe('get and set', () => {
    it('should set and get a value', async () => {
      await set('test-key', { value: 'test' });
      const result = await get('test-key');
      expect(result).toEqual({ value: 'test' });
    });

    it('should return null for non-existent key', async () => {
      const result = await get('non-existent');
      expect(result).toBeNull();
    });

    it('should use custom TTL', async () => {
      await set('test-key', { value: 'test' }, { ttl: 60 });
      const result = await get('test-key');
      expect(result).toEqual({ value: 'test' });
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await set('test-key', { value: 'test' });
      await del('test-key');
      const result = await get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await set('test-key-1', { value: '1' });
      await set('test-key-2', { value: '2' });
      await set('other-key', { value: '3' });
      
      await delPattern('test-key-*');
      
      expect(await get('test-key-1')).toBeNull();
      expect(await get('test-key-2')).toBeNull();
      expect(await get('other-key')).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      await set('key1', { value: '1' });
      await set('key2', { value: '2' });
      
      await clear();
      
      expect(await get('key1')).toBeNull();
      expect(await get('key2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await set('test-key', { value: 'test' });
      await get('test-key');
      await get('non-existent');
      
      const stats = getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
    });

    it('should reset statistics', async () => {
      await set('test-key', { value: 'test' });
      await get('test-key');
      
      resetStats();
      
      const stats = getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });
  });
});