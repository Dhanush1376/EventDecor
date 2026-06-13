import logger from '../config/logger';
import * as Sentry from '@sentry/node';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Name for logging and metrics */
  name: string;
  /** Number of consecutive failures to trip the circuit */
  failureThreshold: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN */
  resetTimeout: number;
  /** Timeout in ms for each operation */
  operationTimeout?: number;
  /** Number of successes in HALF_OPEN state to close the circuit */
  halfOpenSuccessThreshold?: number;
}

/**
 * CircuitBreaker — Protects against cascading failures from external API calls.
 *
 * States:
 * - CLOSED: Normal operation. Failures are counted.
 * - OPEN: All calls are rejected immediately. After resetTimeout, moves to HALF_OPEN.
 * - HALF_OPEN: A limited number of calls are allowed through. If they succeed,
 *   the circuit closes. If they fail, the circuit reopens.
 *
 * Usage:
 * ```
 * const razorpayBreaker = new CircuitBreaker({
 *   name: 'razorpay',
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 * });
 *
 * const result = await razorpayBreaker.execute(() => razorpay.orders.create({...}));
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      operationTimeout: 15000,
      halfOpenSuccessThreshold: 2,
      ...options,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Execute an async operation with circuit breaker protection.
   * @throws Error if the circuit is open or the operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker [${this.options.name}] is OPEN. Service temporarily unavailable.`,
        );
      }
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute an async operation with circuit breaker, returning a fallback on failure.
   * Circuit breaker state is still updated normally.
   */
  async executeWithFallback<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await this.execute(operation);
    } catch (err) {
      if (err instanceof CircuitBreakerError) {
        logger.warn(`[CircuitBreaker:${this.options.name}] Circuit is open, returning fallback`);
      }
      return fallback;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Circuit breaker [${this.options.name}]: Operation timed out after ${this.options.operationTimeout}ms`,
          ),
        );
      }, this.options.operationTimeout);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenSuccessThreshold) {
        this.transitionTo('CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    }

    logger.warn(
      `[CircuitBreaker:${this.options.name}] Failure #${this.failureCount}/${this.options.failureThreshold} (State: ${this.state}): ${error?.message || 'Unknown error'}`,
    );
  }

  private transitionTo(newState: CircuitState): void {
    const prevState = this.state;
    this.state = newState;

    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
    }
    if (newState === 'HALF_OPEN') {
      this.successCount = 0;
    }

    logger.info(
      `[CircuitBreaker:${this.options.name}] State transition: ${prevState} → ${newState}`,
    );

    if (newState === 'OPEN') {
      Sentry.captureMessage(`Circuit breaker [${this.options.name}] tripped to OPEN`, {
        level: 'warning',
        tags: { component: 'circuit_breaker', service: this.options.name },
        extra: { failureCount: this.failureCount, resetTimeout: this.options.resetTimeout },
      });
    }
  }

  /**
   * Force-reset the circuit to CLOSED state (for admin/ops).
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
    logger.info(`[CircuitBreaker:${this.options.name}] Manually reset to CLOSED`);
  }

  /**
   * Get circuit breaker health status for monitoring.
   */
  getStatus() {
    return {
      name: this.options.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.options.failureThreshold,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      resetTimeoutMs: this.options.resetTimeout,
    };
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ─── Pre-configured Circuit Breakers ──────────────────────────────
// Singleton instances for shared use across the application

export const razorpayCircuitBreaker = new CircuitBreaker({
  name: 'razorpay',
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  operationTimeout: 15000, // 15 seconds
});

export const emailCircuitBreaker = new CircuitBreaker({
  name: 'email-provider',
  failureThreshold: 3,
  resetTimeout: 60000, // 60 seconds
  operationTimeout: 10000, // 10 seconds
});

export const cloudinaryCircuitBreaker = new CircuitBreaker({
  name: 'cloudinary',
  failureThreshold: 5,
  resetTimeout: 45000, // 45 seconds
  operationTimeout: 20000, // 20 seconds
});

export const aiVisionCircuitBreaker = new CircuitBreaker({
  name: 'ai-vision',
  failureThreshold: 3,
  resetTimeout: 90000, // 90 seconds (longer cooldown for rate-limited AI APIs)
  operationTimeout: 25000, // 25 seconds (AI inference can be slow)
  halfOpenSuccessThreshold: 2,
});
