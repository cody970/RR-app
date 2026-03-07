import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitState,
  createCircuitBreaker,
} from './circuit-breaker';

describe('Circuit Breaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-circuit', {
      failureThreshold: 3,
      timeout: 1000, // 1 second
      successThreshold: 2,
      monitoringPeriod: 10000,
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isClosed()).toBe(true);
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should have zero stats initially', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.lastFailureTime).toBeNull();
      expect(stats.lastSuccessTime).toBeNull();
    });
  });

  describe('Successful Operations', () => {
    it('should allow operations when CLOSED', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should record successful operations', async () => {
      await circuitBreaker.execute(() => Promise.resolve('success'));
      await circuitBreaker.execute(() => Promise.resolve('success'));

      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(0);
    });

    it('should remain CLOSED on success', async () => {
      await circuitBreaker.execute(() => Promise.resolve('success'));
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Failed Operations', () => {
    it('should throw on failed operations', async () => {
      const error = new Error('Test error');
      await expect(circuitBreaker.execute(() => Promise.reject(error))).rejects.toThrow(error);
    });

    it('should record failed operations', async () => {
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {
        // Expected
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBeGreaterThan(0);
      expect(stats.successCount).toBe(0);
    });

    it('should trip circuit after threshold failures', async () => {
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should fail fast when OPEN', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
        } catch (e) {
          // Expected
        }
      }

      // Try to execute again - should fail immediately
      const fn = vi.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitBreakerOpenError);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('Recovery (HALF_OPEN)', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next call should transition to HALF_OPEN and allow execution
      const result = await circuitBreaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close circuit after successful threshold in HALF_OPEN', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
        } catch (e) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Execute 2 successful operations (threshold = 2)
      await circuitBreaker.execute(() => Promise.resolve('success'));
      await circuitBreaker.execute(() => Promise.resolve('success'));

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should re-open circuit on failure in HALF_OPEN', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
        } catch (e) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // One success
      await circuitBreaker.execute(() => Promise.resolve('success'));
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      // One failure should re-open circuit (after reaching failure threshold again)
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {
        // Expected
      }
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {
        // Expected
      }
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Reset', () => {
    it('should reset to CLOSED state', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });
  });

  describe('State Change Callback', () => {
    it('should call callback on state change', async () => {
      const callback = vi.fn();
      const cb = new CircuitBreaker('test-circuit', {
        failureThreshold: 2,
        timeout: 1000,
        successThreshold: 2,
        onStateChange: callback,
      });

      // Trigger state change to OPEN
      try {
        await cb.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {}
      try {
        await cb.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {}

      expect(callback).toHaveBeenCalledWith(CircuitState.OPEN);
    });
  });

  describe('Factory Function', () => {
    it('should create circuit breaker with default options', () => {
      const cb = createCircuitBreaker('default-circuit');
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should create circuit breaker with custom options', () => {
      const cb = createCircuitBreaker('custom-circuit', {
        failureThreshold: 10,
        timeout: 5000,
      });
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', async () => {
      // 2 successes
      await circuitBreaker.execute(() => Promise.resolve('success'));
      await circuitBreaker.execute(() => Promise.resolve('success'));

      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(0);
      expect(stats.lastSuccessTime).toBeTruthy();
      expect(stats.lastFailureTime).toBeNull();

      // 1 failure
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('Test')));
      } catch (e) {
        // Expected
      }

      const statsAfterFailure = circuitBreaker.getStats();
      expect(statsAfterFailure.successCount).toBe(0); // Reset on failure
      expect(statsAfterFailure.failureCount).toBe(1);
      expect(statsAfterFailure.lastFailureTime).toBeTruthy();
    });
  });
});