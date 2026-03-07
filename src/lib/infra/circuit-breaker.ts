/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides fault tolerance for external dependencies (Redis, databases, APIs).
 * Prevents cascading failures by temporarily blocking calls to failing services.
 * 
 * States:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: Circuit is tripped, calls fail fast
 * - HALF_OPEN: Testing if service has recovered, allows limited calls
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before tripping (default: 5)
  timeout: number; // Time in ms to wait before trying again (default: 60000 = 1 minute)
  successThreshold: number; // Number of successes to close circuit in HALF_OPEN (default: 2)
  monitoringPeriod?: number; // Time window to count failures (default: 10000 = 10 seconds)
  onStateChange?: (state: CircuitState) => void; // Callback for state changes
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private failuresInWindow: number[] = []; // Timestamps of recent failures

  constructor(private name: string, private options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: 5,
      timeout: 60000,
      successThreshold: 2,
      monitoringPeriod: 10000,
      ...options,
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Check if we should attempt recovery
    if (this.state === CircuitState.OPEN && this.nextAttemptTime && now >= this.nextAttemptTime) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    // Fail fast if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker '${this.name}' is OPEN. Try again after ${this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : 'unknown'}.`
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    const now = Date.now();
    this.successCount++;
    this.lastSuccessTime = now;
    this.failureCount = 0;
    this.failuresInWindow = [];

    // If in HALF_OPEN and we've reached success threshold, close the circuit
    if (this.state === CircuitState.HALF_OPEN && this.successCount >= this.options.successThreshold) {
      this.transitionTo(CircuitState.CLOSED);
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(): void {
    const now = Date.now();
    this.failureCount++;
    this.lastFailureTime = now;
    this.failuresInWindow.push(now);
    this.successCount = 0;

    // Clean up old failures outside the monitoring window
    const monitoringPeriod = this.options.monitoringPeriod || 10000;
    this.failuresInWindow = this.failuresInWindow.filter(t => now - t < monitoringPeriod);

    // Check if we should trip the circuit
    if (
      this.failuresInWindow.length >= this.options.failureThreshold &&
      this.state !== CircuitState.OPEN
    ) {
      this.transitionTo(CircuitState.OPEN);
      this.nextAttemptTime = now + this.options.timeout;
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    console.log(
      `[Circuit Breaker] '${this.name}' transitioned from ${oldState} to ${newState}`
    );

    if (this.options.onStateChange) {
      this.options.onStateChange(newState);
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.failuresInWindow = [];

    console.log(`[Circuit Breaker] '${this.name}' reset to CLOSED state`);
  }

  /**
   * Get the current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if the circuit is currently closed (allowing calls)
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if the circuit is currently open (blocking calls)
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
}

/**
 * Custom error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Create a circuit breaker with default options
 */
export function createCircuitBreaker(
  name: string,
  options?: Partial<CircuitBreakerOptions>
): CircuitBreaker {
  return new CircuitBreaker(name, options || {});
}