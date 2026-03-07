/**
 * Enhanced Redis Connection with Retry Logic and Error Handling
 * 
 * Provides robust Redis connection management:
 * - Automatic reconnection on connection loss
 * - Connection health monitoring
 * - Retry logic for failed operations
 * - Circuit breaker pattern
 */

import Redis from 'ioredis';
import { withRetry, CircuitBreaker } from './retry';
import { asyncLogger } from './logger-async';

const MAX_RETRIES = 5;
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const OPERATION_TIMEOUT = 5000; // 5 seconds

class RedisConnection {
  private client: Redis | null = null;
  private circuitBreaker: CircuitBreaker;
  private isHealthy: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 20000, // 20 seconds
      monitoringPeriod: 60000, // 1 minute
    });
  }

  async connect(): Promise<Redis> {
    if (this.client && this.isHealthy) {
      return this.client;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      const client = await withRetry(
        async () => {
          const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: null, // Required by bullmq
            connectTimeout: CONNECTION_TIMEOUT,
            lazyConnect: true,
            retryStrategy: (times) => {
              const delay = Math.min(times * 100, 3000);
              asyncLogger.warn(`Redis reconnection attempt ${times}`, { delay });
              return delay;
            },
          });

          // Set up error handlers
          redis.on('error', (error) => {
            asyncLogger.error('Redis connection error', error);
            this.isHealthy = false;
          });

          redis.on('connect', () => {
            asyncLogger.info('Redis connected successfully');
            this.isHealthy = true;
            this.reconnectAttempts = 0;
          });

          redis.on('close', () => {
            asyncLogger.warn('Redis connection closed');
            this.isHealthy = false;
          });

          redis.on('reconnecting', () => {
            this.reconnectAttempts++;
            asyncLogger.info(`Redis reconnecting (attempt ${this.reconnectAttempts})`);
          });

          // Test connection
          await redis.ping();
          
          asyncLogger.info('Redis connection established');
          return redis;
        },
        {
          maxAttempts: MAX_RETRIES,
          initialDelay: 1000,
          maxDelay: 10000,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
          onRetry: (attempt, error) => {
            asyncLogger.warn(
              `Redis connection retry attempt ${attempt}`,
              { error: error.message }
            );
          }
        }
      );

      this.client = client;
      this.isHealthy = true;
      this.startHealthChecks();

      return client;
    } catch (error) {
      this.isHealthy = false;
      asyncLogger.error('Failed to establish Redis connection', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isHealthy = false;
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      asyncLogger.info('Redis connection closed');
    }
  }

  async executeCommand<T>(
    commandName: string,
    commandFn: (client: Redis) => Promise<T>,
    options: { timeout?: number } = {}
  ): Promise<T> {
    const timeout = options.timeout || OPERATION_TIMEOUT;

    return this.circuitBreaker.execute(async () => {
      const client = await this.connect();

      // Add timeout to operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Redis command timeout: ${commandName}`));
        }, timeout);
      });

      return Promise.race([
        commandFn(client),
        timeoutPromise
      ]).catch(error => {
        asyncLogger.error(
          `Redis command failed: ${commandName}`,
          error as Error,
          { commandName, timeout }
        );
        throw error;
      });
    });
  }

  private async healthCheck(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.ping();
      
      if (!this.isHealthy) {
        this.isHealthy = true;
        asyncLogger.info('Redis health check passed - connection restored');
      }
    } catch (error) {
      this.isHealthy = false;
      asyncLogger.error('Redis health check failed', error as Error);
      
      // Mark circuit breaker as failed
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 20000,
        monitoringPeriod: 60000,
      });
    }
  }

  private startHealthChecks(): void {
    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(
      () => this.healthCheck(),
      30000
    );
  }

  async getHealthStatus(): Promise<{ 
    isHealthy: boolean; 
    circuitBreakerOpen: boolean;
    connectionActive: boolean;
    reconnectAttempts: number;
  }> {
    return {
      isHealthy: this.isHealthy,
      circuitBreakerOpen: this.circuitBreaker.getState().isOpen,
      connectionActive: this.client !== null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Convenience methods for common Redis operations
  async get(key: string): Promise<string | null> {
    return this.executeCommand('GET', (client) => client.get(key));
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK' | null> {
    return this.executeCommand('SET', (client) => {
      if (ttl) {
        return client.set(key, value, 'EX', ttl);
      }
      return client.set(key, value);
    });
  }

  async del(key: string): Promise<number> {
    return this.executeCommand('DEL', (client) => client.del(key));
  }

  async exists(key: string): Promise<number> {
    return this.executeCommand('EXISTS', (client) => client.exists(key));
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.executeCommand('EXPIRE', (client) => client.expire(key, seconds));
  }

  async incr(key: string): Promise<number> {
    return this.executeCommand('INCR', (client) => client.incr(key));
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.executeCommand('INCRBY', (client) => client.incrby(key, increment));
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.executeCommand('HGET', (client) => client.hget(key, field));
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.executeCommand('HSET', (client) => client.hset(key, field, value));
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.executeCommand('HGETALL', (client) => client.hgetall(key));
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.executeCommand('LPUSH', (client) => client.lpush(key, ...values));
  }

  async rpop(key: string): Promise<string | null> {
    return this.executeCommand('RPOP', (client) => client.rpop(key));
  }

  async blpop(key: string, timeout: number): Promise<[string, string] | null> {
    return this.executeCommand('BLPOP', (client) => client.blpop(key, timeout), {
      timeout: (timeout + 5) * 1000 // Add buffer to timeout
    });
  }
}

// Singleton instance
const redisConnection = new RedisConnection();

// Convenience functions
export const getRedisClient = () => redisConnection.connect();
export const executeRedisCommand = <T>(
  commandName: string,
  commandFn: (client: Redis) => Promise<T>,
  options?: { timeout?: number }
) => redisConnection.executeCommand(commandName, commandFn, options);
export const getRedisHealth = () => redisConnection.getHealthStatus();
export const disconnectRedis = () => redisConnection.disconnect();

// Common Redis operations
export const redisGet = (key: string) => redisConnection.get(key);
export const redisSet = (key: string, value: string, ttl?: number) => 
  redisConnection.set(key, value, ttl);
export const redisDel = (key: string) => redisConnection.del(key);
export const redisExists = (key: string) => redisConnection.exists(key);
export const redisExpire = (key: string, seconds: number) => 
  redisConnection.expire(key, seconds);
export const redisIncr = (key: string) => redisConnection.incr(key);
export const redisIncrby = (key: string, increment: number) => 
  redisConnection.incrby(key, increment);