import { Request, Response, NextFunction } from 'express';

interface RouteMetric {
  count: number;
  totalDuration: number;
  errors: number;
}

const routeMetrics = new Map<string, RouteMetric>();
let totalRequests = 0;
let totalErrors = 0;
let totalDuration = 0;

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
    
    totalRequests++;
    totalDuration += durationMs;
    const isError = statusCode >= 400;
    if (isError) {
      totalErrors++;
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

  return {
    totalRequests,
    totalErrors,
    errorRate: totalRequests > 0 ? `${Math.round((totalErrors / totalRequests) * 100)}%` : '0%',
    avgResponseTimeMs: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
    routes: routeStats
  };
};
