/**
 * Retry Logic with Exponential Backoff
 * 
 * Provides robust retry mechanisms for:
 * - Transient network failures
 * - Database connection issues
 * - External API rate limits
 * - Temporary service unavailability
 */

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'EPIPE',
    'RateLimitError',
    'P1001', // Database connection error
    'P1002', // Database timeout
    '503', // Service unavailable
    '504', // Gateway timeout
    '429', // Too many requests
  ],
};

function isRetryableError(error: Error, options: RetryOptions): boolean {
  // Check if error message contains any retryable error pattern
  for (const pattern of options.retryableErrors) {
    if (error.message.includes(pattern) || error.name.includes(pattern)) {
      return true;
    }
  }
  
  // Check for HTTP status codes (if error has status property)
  const statusCode = (error as any).status || (error as any).code;
  if (statusCode && typeof statusCode === 'string' && options.retryableErrors.includes(statusCode)) {
    return true;
  }
  
  if (statusCode && typeof statusCode === 'number') {
    if (statusCode >= 500 || statusCode === 429) {
      return true;
    }
  }
  
  return false;
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1),
    options.maxDelay
  );
  
  // Add some jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();
  return Math.floor(delay + jitter);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= mergedOptions.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === mergedOptions.maxAttempts || !isRetryableError(lastError, mergedOptions)) {
        throw lastError;
      }
      
      const delay = calculateDelay(attempt, mergedOptions);
      
      if (mergedOptions.onRetry) {
        mergedOptions.onRetry(attempt, lastError);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by temporarily disabling calls to failing services
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
  };
  
  constructor(private options: CircuitBreakerOptions) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.isOpen) {
      const now = Date.now();
      if (now - this.state.lastFailureTime > this.options.resetTimeout) {
        // Attempt to reset circuit
        this.state.isOpen = false;
        this.state.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.state.failures = 0;
  }
  
  private onFailure() {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failures >= this.options.failureThreshold) {
      this.state.isOpen = true;
    }
  }
  
  getState() {
    return { ...this.state };
  }
  
  reset() {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
    };
  }
}

/**
 * Rate Limiting with Token Bucket
 * 
 * Provides distributed rate limiting using Redis
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  async tryConsume(tokens = 1): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }
  
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Distributed Lock using Redis
 * 
 * Provides cross-process locking for critical sections
 */
export class DistributedLock {
  constructor(
    private redis: any,
    private lockTimeout: number = 10000 // 10 seconds default
  ) {}
  
  async acquireLock(key: string, ttl: number = this.lockTimeout): Promise<boolean> {
    try {
      const result = await this.redis.set(
        `lock:${key}`,
        '1',
        'PX',
        ttl,
        'NX'
      );
      return result === 'OK';
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  }
  
  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(`lock:${key}`);
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }
  
  async withLock<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const acquired = await this.acquireLock(key, ttl);
    
    if (!acquired) {
      throw new Error(`Could not acquire lock for key: ${key}`);
    }
    
    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }
}