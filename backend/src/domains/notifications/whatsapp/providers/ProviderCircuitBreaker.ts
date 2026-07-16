import logger from '../../../../config/logger';
import WhatsAppProviderConfig from '../../../../models/WhatsAppProviderConfig';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitStateData {
  state: CircuitState;
  failures: number;
  lastFailureAt?: number;
  halfOpenAttempts: number;
}

/**
 * Provider Circuit Breaker prevents repeated calls to failing providers
 * and facilitates automatic failover.
 * It uses an in-memory map backed by DB configurations.
 */
export class ProviderCircuitBreaker {
  private static states = new Map<string, CircuitStateData>();
  private static defaultThresholds = {
    failureThreshold: 3,
    resetTimeoutMs: 60000,
    halfOpenMaxAttempts: 1,
  };

  /**
   * Evaluates if the provider's circuit is currently closed (healthy to use).
   */
  public static async isAvailable(providerName: string): Promise<boolean> {
    const currentState = this.getState(providerName);

    if (currentState.state === 'CLOSED') {
      return true;
    }

    const config = await this.getConfig(providerName);
    const now = Date.now();

    if (currentState.state === 'OPEN') {
      // Check if cooldown period is over
      if (currentState.lastFailureAt && now - currentState.lastFailureAt > config.resetTimeoutMs) {
        logger.info(
          `[CircuitBreaker] ${providerName} cooldown finished. Transitioning to HALF_OPEN.`,
        );
        currentState.state = 'HALF_OPEN';
        currentState.halfOpenAttempts = 0;
        this.states.set(providerName, currentState);
        return true; // We can try one request
      }
      return false; // Still cooling down
    }

    if (currentState.state === 'HALF_OPEN') {
      if (currentState.halfOpenAttempts < config.halfOpenMaxAttempts) {
        currentState.halfOpenAttempts += 1;
        this.states.set(providerName, currentState);
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Record a successful request. Resets the circuit.
   */
  public static recordSuccess(providerName: string): void {
    const currentState = this.getState(providerName);
    if (currentState.state !== 'CLOSED' || currentState.failures > 0) {
      logger.info(`[CircuitBreaker] ${providerName} recovered. State reset to CLOSED.`);
      this.states.set(providerName, {
        state: 'CLOSED',
        failures: 0,
        halfOpenAttempts: 0,
      });
    }
  }

  /**
   * Record a failed request. May trip the circuit.
   */
  public static async recordFailure(providerName: string): Promise<void> {
    const currentState = this.getState(providerName);
    const config = await this.getConfig(providerName);

    currentState.failures += 1;
    currentState.lastFailureAt = Date.now();

    if (currentState.state === 'HALF_OPEN') {
      // Failed during test -> immediately OPEN
      logger.warn(
        `[CircuitBreaker] ${providerName} failed during HALF_OPEN. Tripping back to OPEN.`,
      );
      currentState.state = 'OPEN';
    } else if (currentState.state === 'CLOSED') {
      // Check if threshold exceeded
      if (currentState.failures >= config.failureThreshold) {
        logger.warn(
          `[CircuitBreaker] ${providerName} exceeded failure threshold (${currentState.failures}). Tripping circuit OPEN.`,
        );
        currentState.state = 'OPEN';
      }
    }

    this.states.set(providerName, currentState);
  }

  /**
   * Manually force a circuit open (e.g. via admin panel)
   */
  public static forceOpen(providerName: string): void {
    logger.warn(`[CircuitBreaker] Manually forcing circuit OPEN for ${providerName}.`);
    this.states.set(providerName, {
      state: 'OPEN',
      failures: 999,
      lastFailureAt: Date.now(),
      halfOpenAttempts: 0,
    });
  }

  private static getState(providerName: string): CircuitStateData {
    if (!this.states.has(providerName)) {
      this.states.set(providerName, {
        state: 'CLOSED',
        failures: 0,
        halfOpenAttempts: 0,
      });
    }
    return this.states.get(providerName)!;
  }

  private static async getConfig(providerName: string) {
    // Try to load from DB, fallback to defaults
    const config = await WhatsAppProviderConfig.findOne({ providerName });
    if (config && config.circuitBreaker) {
      return {
        failureThreshold:
          config.circuitBreaker.failureThreshold || this.defaultThresholds.failureThreshold,
        resetTimeoutMs:
          config.circuitBreaker.resetTimeoutMs || this.defaultThresholds.resetTimeoutMs,
        halfOpenMaxAttempts:
          config.circuitBreaker.halfOpenMaxAttempts || this.defaultThresholds.halfOpenMaxAttempts,
      };
    }
    return this.defaultThresholds;
  }
}
