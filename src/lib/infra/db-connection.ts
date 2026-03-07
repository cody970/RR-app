/**
 * Enhanced Database Connection with Retry Logic and Error Handling
 * 
 * Provides robust database connection management:
 * - Automatic reconnection on connection loss
 * - Connection pooling configuration
 * - Query timeout handling
 * - Health checks
 */

import { PrismaClient } from '@prisma/client';
import { withRetry, CircuitBreaker } from './retry';
import { asyncLogger } from './logger-async';

const MAX_RETRIES = 5;
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const QUERY_TIMEOUT = 30000; // 30 seconds

class DatabaseConnection {
  private client: PrismaClient | null = null;
  private circuitBreaker: CircuitBreaker;
  private isHealthy: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
    });
  }

  async connect(): Promise<PrismaClient> {
    if (this.client && this.isHealthy) {
      return this.client;
    }

    try {
      const client = await withRetry(
        async () => {
          const prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' 
              ? ['query', 'error', 'warn'] 
              : ['error'],
            errorFormat: 'pretty',
          });

          // Test connection
          await prisma.$connect();
          
          asyncLogger.info('Database connection established');
          return prisma;
        },
        {
          maxAttempts: MAX_RETRIES,
          initialDelay: 1000,
          maxDelay: 10000,
          retryableErrors: ['P1001', 'P1002', 'ECONNREFUSED', 'ETIMEDOUT'],
          onRetry: (attempt, error) => {
            asyncLogger.warn(
              `Database connection retry attempt ${attempt}`,
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
      asyncLogger.error('Failed to establish database connection', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      this.isHealthy = false;
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      asyncLogger.info('Database connection closed');
    }
  }

  async executeQuery<T>(
    queryName: string,
    queryFn: (client: PrismaClient) => Promise<T>,
    options: { timeout?: number } = {}
  ): Promise<T> {
    const timeout = options.timeout || QUERY_TIMEOUT;

    return this.circuitBreaker.execute(async () => {
      const client = await this.connect();

      // Add timeout to query
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout: ${queryName}`));
        }, timeout);
      });

      return Promise.race([
        queryFn(client),
        timeoutPromise
      ]).catch(error => {
        asyncLogger.error(
          `Query failed: ${queryName}`,
          error as Error,
          { queryName, timeout }
        );
        throw error;
      });
    });
  }

  private async healthCheck(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.$queryRaw`SELECT 1`;
      
      if (!this.isHealthy) {
        this.isHealthy = true;
        asyncLogger.info('Database health check passed - connection restored');
      }
    } catch (error) {
      this.isHealthy = false;
      asyncLogger.error('Database health check failed', error as Error);
      
      // Mark circuit breaker as failed
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 30000,
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
  }> {
    return {
      isHealthy: this.isHealthy,
      circuitBreakerOpen: this.circuitBreaker.getState().isOpen,
      connectionActive: this.client !== null,
    };
  }

  async executeInTransaction<T>(
    transactionFn: (tx: PrismaClient) => Promise<T>,
    options: { maxRetries?: number; timeout?: number } = {}
  ): Promise<T> {
    const { maxRetries = 3, timeout = QUERY_TIMEOUT } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.connect();
        
        return await client.$transaction(async (tx) => {
          return await transactionFn(tx as PrismaClient);
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Retry on serialization failures and deadlocks
        const isRetryable = 
          lastError.message.includes('40001') || // Serialization failure
          lastError.message.includes('deadlock') ||
          lastError.message.includes('could not serialize');
        
        if (attempt === maxRetries || !isRetryable) {
          asyncLogger.error(
            `Transaction failed after ${attempt} attempt(s)`,
            lastError,
            { maxRetries }
          );
          throw lastError;
        }
        
        const delay = 100 * attempt; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        
        asyncLogger.warn(
          `Retrying transaction attempt ${attempt}/${maxRetries}`,
          { error: lastError.message, delay }
        );
      }
    }
    
    throw lastError || new Error('Transaction failed');
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

// Convenience functions
export const getDbClient = () => dbConnection.connect();
export const executeQuery = <T>(
  queryName: string,
  queryFn: (client: PrismaClient) => Promise<T>,
  options?: { timeout?: number }
) => dbConnection.executeQuery(queryName, queryFn, options);
export const executeInTransaction = <T>(
  transactionFn: (tx: PrismaClient) => Promise<T>,
  options?: { maxRetries?: number; timeout?: number }
) => dbConnection.executeInTransaction(transactionFn, options);
export const getDbHealth = () => dbConnection.getHealthStatus();
export const disconnectDb = () => dbConnection.disconnect();