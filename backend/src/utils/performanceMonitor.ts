import mongoose from 'mongoose';
import logger from '../config/logger';

/**
 * Production performance monitoring utility.
 * Tracks event loop lag, memory pressure, and slow queries.
 */

// ── 1. Event Loop & Memory Monitoring ──
let eventLoopMonitorInterval: NodeJS.Timeout | null = null;
const LAG_WARNING_THRESHOLD_MS = 100;
const MEMORY_WARNING_THRESHOLD_PERCENT = 0.85;

export const startPerformanceMonitoring = () => {
  if (eventLoopMonitorInterval) return;

  // Measure event loop lag every 5 seconds
  let lastTick = performance.now();
  
  eventLoopMonitorInterval = setInterval(() => {
    const currentTick = performance.now();
    const lag = currentTick - lastTick - 5000;
    lastTick = currentTick;

    if (lag > LAG_WARNING_THRESHOLD_MS) {
      logger.warn(`[PERF] Event loop lag detected: ${Math.round(lag)}ms (threshold: ${LAG_WARNING_THRESHOLD_MS}ms)`);
    }

    // Memory pressure check
    const memUsage = process.memoryUsage();
    // Assuming 512MB max heap on standard container instance
    const maxHeap = require('v8').getHeapStatistics().heap_size_limit;
    const heapRatio = memUsage.heapUsed / maxHeap;

    if (heapRatio > MEMORY_WARNING_THRESHOLD_PERCENT) {
      logger.warn(`[PERF] High memory pressure: ${Math.round(heapRatio * 100)}% heap used (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(maxHeap / 1024 / 1024)}MB)`);
    }

  }, 5000);

  if (eventLoopMonitorInterval.unref) {
    eventLoopMonitorInterval.unref();
  }
  
  logger.info('[PERF] Application performance monitoring started');
};

export const stopPerformanceMonitoring = () => {
  if (eventLoopMonitorInterval) {
    clearInterval(eventLoopMonitorInterval);
    eventLoopMonitorInterval = null;
  }
};

// ── 2. Mongoose Slow Query Logger ──
const SLOW_QUERY_THRESHOLD_MS = 1000;

/**
 * Mongoose plugin to log slow queries automatically.
 * Should be applied globally or to specific performance-critical models.
 */
export const slowQueryLoggerPlugin = (schema: mongoose.Schema) => {
  // Pre hooks to mark start time
  schema.pre(/^(find|findOne|findOneAndUpdate|findOneAndDelete|countDocuments|aggregate)$/, function(this: any, next: any) {
    this._startTime = performance.now();
    next();
  });

  // Post hooks to measure duration and log
  schema.post(/^(find|findOne|findOneAndUpdate|findOneAndDelete|countDocuments|aggregate)$/, function(this: any, res: any, next: any) {
    if (this._startTime) {
      const duration = performance.now() - this._startTime;
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        const modelName = this.model?.modelName || 'UnknownModel';
        const operation = this.op || 'aggregate';
        
        // Safely stringify query conditions for logging
        let queryStr = '{}';
        try {
          const filter = typeof this.getFilter === 'function' ? this.getFilter() : (this._pipeline || []);
          queryStr = JSON.stringify(filter).substring(0, 500); // Cap length
        } catch (e) {
          queryStr = '[unserializable]';
        }

        logger.warn(`[PERF DB] Slow Query: ${modelName}.${operation} took ${Math.round(duration)}ms`, {
          durationMs: Math.round(duration),
          query: queryStr
        });
      }
    }
    
    // Call next() if it's a function (depends on Mongoose version hook signature)
    if (typeof next === 'function') {
      next();
    }
  });
};

// Apply slow query logger to all schemas globally
mongoose.plugin(slowQueryLoggerPlugin);

// ── 3. Health Score Calculation ──
export const getHealthScore = (): number => {
  let score = 100;
  
  // Deduct for memory pressure
  const memUsage = process.memoryUsage();
  const maxHeap = require('v8').getHeapStatistics().heap_size_limit;
  const heapRatio = memUsage.heapUsed / maxHeap;
  if (heapRatio > 0.9) score -= 30;
  else if (heapRatio > 0.7) score -= 10;
  
  // Deduct for DB state
  if (mongoose.connection.readyState !== 1) score -= 50;
  
  return Math.max(0, score);
};
