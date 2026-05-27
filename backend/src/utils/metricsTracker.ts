import { Request, Response, NextFunction } from 'express';

interface RouteMetric {
  count: number;
  totalDuration: number;
  errors: number;
}

const MAX_ROUTE_ENTRIES = 500;
const routeMetrics = new Map<string, RouteMetric>();
let totalRequests = 0;
let totalErrors = 0;
let totalDuration = 0;
let lastResetAt = Date.now();

// Periodic counter reset to prevent unbounded growth (every 24 hours)
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const metricsTrackerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const route = `${req.method} ${req.route?.path || req.baseUrl || req.path}`;
    const diff = process.hrtime(startTime);
    const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
    const statusCode = res.statusCode;
    
    // Ignore static assets/health checks from custom metrics to avoid noise
    const path = req.path;
    if (path === '/api/health' || path === '/api/readiness' || path === '/api/metrics' || path === '/favicon.ico') {
      return;
    }

    // Periodic reset to prevent unbounded counter growth
    if (Date.now() - lastResetAt > RESET_INTERVAL_MS) {
      routeMetrics.clear();
      totalRequests = 0;
      totalErrors = 0;
      totalDuration = 0;
      lastResetAt = Date.now();
    }
    
    totalRequests++;
    totalDuration += durationMs;
    const isError = statusCode >= 400;
    if (isError) {
      totalErrors++;
    }

    // Evict oldest entry if map exceeds cap (prevents memory leak from parameterized URLs)
    if (routeMetrics.size >= MAX_ROUTE_ENTRIES && !routeMetrics.has(route)) {
      const oldestKey = routeMetrics.keys().next().value;
      if (oldestKey) routeMetrics.delete(oldestKey);
    }
    
    const existing = routeMetrics.get(route) || { count: 0, totalDuration: 0, errors: 0 };
    existing.count++;
    existing.totalDuration += durationMs;
    if (isError) {
      existing.errors++;
    }
    routeMetrics.set(route, existing);
  });
  
  next();
};

export const getMetricsReport = () => {
  const routeStats = Array.from(routeMetrics.entries()).map(([route, stats]) => ({
    route,
    requests: stats.count,
    avgDurationMs: Math.round(stats.totalDuration / stats.count),
    errorRate: `${Math.round((stats.errors / stats.count) * 100)}%`,
    errors: stats.errors
  }));

  // Include memory usage for leak detection
  const memUsage = process.memoryUsage();

  return {
    totalRequests,
    totalErrors,
    errorRate: totalRequests > 0 ? `${Math.round((totalErrors / totalRequests) * 100)}%` : '0%',
    avgResponseTimeMs: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
    routeMetricsCount: routeMetrics.size,
    lastResetAt: new Date(lastResetAt).toISOString(),
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024),
    },
    routes: routeStats
  };
};

