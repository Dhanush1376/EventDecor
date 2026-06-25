import logger from '../../config/logger';

export class IdempotencyManager {
  // Simple in-memory cache for idempotency.
  // In production, this should use Redis with a TTL.
  private static cache = new Map<string, number>();

  /**
   * Checks if an event has already been processed within the given TTL (ms).
   * Generates a key based on the event and payload identifier (e.g., orderId).
   */
  public static isDuplicate(
    event: string,
    aggregateId: string,
    ttlMs: number = 24 * 60 * 60 * 1000,
  ): boolean {
    const key = `${event}:${aggregateId}`;
    const now = Date.now();

    const lastSeen = this.cache.get(key);
    if (lastSeen && now - lastSeen < ttlMs) {
      logger.debug(`[IDEMPOTENCY] Duplicate event detected for key: ${key}`);
      return true;
    }

    // Cleanup old entries randomly to prevent memory leak in this basic implementation
    if (Math.random() < 0.05) this.cleanup(now);

    this.cache.set(key, now);
    return false;
  }

  private static cleanup(now: number) {
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        this.cache.delete(key);
      }
    }
  }
}
