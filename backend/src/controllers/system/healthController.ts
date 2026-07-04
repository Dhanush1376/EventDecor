import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../../utils/cache/redis';
import logger from '../../config/logger';

/**
 * Health Check Controller — Provides liveness, readiness, and deep health probes
 * for load balancers, container orchestrators, and monitoring systems.
 */
export class HealthController {
  /**
   * GET /health — Basic liveness probe.
   * Returns 200 if the process is alive. Used by load balancers for keep-alive.
   */
  static liveness(req: Request, res: Response) {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  }

  /**
   * GET /health/ready — Readiness probe.
   * Returns 200 only if core dependencies (MongoDB) are connected.
   * Used by load balancers to decide whether to route traffic.
   */
  static async readiness(req: Request, res: Response) {
    const checks: Record<string, { status: string; latencyMs?: number; readyState?: number }> = {};

    // MongoDB check
    const mongoStart = Date.now();
    try {
      const mongoState = mongoose.connection.readyState;
      if (mongoState === 1 && mongoose.connection.db) {
        const pingResult = await Promise.race([
          mongoose.connection.db.admin().ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 15000)),
        ]);
        if (pingResult && (pingResult as any).ok === 1) {
          checks.mongodb = { status: 'connected', latencyMs: Date.now() - mongoStart };
        } else {
          checks.mongodb = { status: 'degraded', latencyMs: Date.now() - mongoStart };
        }
      } else {
        checks.mongodb = { status: 'disconnected' };
      }
    } catch (err: any) {
      checks.mongodb = { status: 'error', latencyMs: Date.now() - mongoStart };
      logger.warn(`[HEALTH] MongoDB readiness check failed: ${err.message}`);
    }

    // Redis check
    const redisStart = Date.now();
    try {
      if (redisClient && redisClient.isReady) {
        const pong = await Promise.race([
          redisClient.ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Redis ping timeout')), 3000),
          ),
        ]);
        checks.redis = {
          status: pong === 'PONG' ? 'connected' : 'degraded',
          latencyMs: Date.now() - redisStart,
        };
      } else {
        checks.redis = { status: 'not_configured' };
      }
    } catch {
      checks.redis = { status: 'error', latencyMs: Date.now() - redisStart };
    }

    checks.connectionPool = {
      status: 'info',
      readyState: mongoose.connection.readyState,
    };

    const isReady = checks.mongodb.status === 'connected';
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  /**
   * GET /health/deep — Deep health check (admin-only).
   * Checks all dependencies and provides detailed system information.
   */
  static async deepHealth(req: Request, res: Response) {
    const checks: Record<string, any> = {};

    // MongoDB
    try {
      const mongoStart = Date.now();
      const mongoState = mongoose.connection.readyState;
      if (mongoState === 1) {
        await mongoose.connection.db!.admin().ping();
        const stats = await mongoose.connection.db!.stats();
        checks.mongodb = {
          status: 'connected',
          latencyMs: Date.now() - mongoStart,
          collections: stats.collections,
          dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
          indexes: stats.indexes,
        };
      } else {
        checks.mongodb = { status: 'disconnected', readyState: mongoState };
      }
    } catch (err: any) {
      checks.mongodb = { status: 'error', error: err.message };
    }

    // Redis
    try {
      if (redisClient && redisClient.isReady) {
        const redisStart = Date.now();
        await redisClient.ping();
        checks.redis = {
          status: 'connected',
          latencyMs: Date.now() - redisStart,
        };
      } else {
        checks.redis = { status: 'not_configured' };
      }
    } catch (err: any) {
      checks.redis = { status: 'error', error: err.message };
    }

    // Razorpay
    checks.razorpay = {
      configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      webhookConfigured: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    };

    // Cloudinary & Local Storage
    try {
      const cloudinary = require('cloudinary').v2;
      const pingResult = await cloudinary.api.ping();

      let cloudinaryUsage = null;
      try {
        const usage = await cloudinary.api.usage();
        cloudinaryUsage = {
          creditsUsed: usage.credits?.usage || 0,
          storageUsedMB: usage.storage?.usage
            ? (usage.storage.usage / (1024 * 1024)).toFixed(2)
            : 0,
        };
      } catch {} // May fail if API rate limit exceeded

      checks.cloudinary = {
        status: pingResult.status === 'ok' ? 'connected' : 'error',
        usage: cloudinaryUsage,
      };

      const os = require('os');
      const fs = require('fs');
      if (fs.promises.statfs) {
        const tempDir = os.tmpdir();
        const stat = await fs.promises.statfs(tempDir);
        const freeGB = (stat.bfree * stat.bsize) / (1024 * 1024 * 1024);
        checks.tempDisk = {
          status: freeGB > 1 ? 'healthy' : 'degraded',
          freeSpaceGB: parseFloat(freeGB.toFixed(2)),
        };
      }
    } catch (err: any) {
      checks.cloudinary = { status: 'error', error: err.message };
    }

    // Sockets
    try {
      const { getSocketCounts } = require('../../socket');
      checks.sockets = getSocketCounts();
    } catch (err: any) {
      checks.sockets = { status: 'error', error: err.message };
    }

    // BullMQ Queues
    try {
      const {
        emailQueue,
        notificationQueue,
        webhookQueue,
        refundQueue,
        isQueuesReady,
      } = require('../../jobs/queues');
      if (isQueuesReady()) {
        const queueStats = async (queue: any) => ({
          waiting: await queue.getWaitingCount(),
          active: await queue.getActiveCount(),
          failed: await queue.getFailedCount(),
          delayed: await queue.getDelayedCount(),
        });

        checks.queues = {
          status: 'connected',
          email: await queueStats(emailQueue),
          notification: await queueStats(notificationQueue),
          webhook: await queueStats(webhookQueue),
          refund: await queueStats(refundQueue),
        };
      } else {
        checks.queues = { status: 'disconnected' };
      }
    } catch (err: any) {
      checks.queues = { status: 'error', error: err.message };
    }

    // Outbox Backlog
    try {
      const OutboxEvent = require('../../models/OutboxEvent').default;
      const pendingEvents = await OutboxEvent.countDocuments({ status: 'PENDING' });
      const failedEvents = await OutboxEvent.countDocuments({ status: 'FAILED' });
      checks.outbox = {
        pendingCount: pendingEvents,
        failedCount: failedEvents,
        status: pendingEvents > 100 ? 'degraded' : 'healthy', // High backlog warning
      };
    } catch (err: any) {
      checks.outbox = { status: 'error', error: err.message };
    }

    // Inventory Health (Negative Stock)
    try {
      const Product = require('../../models/Product').default;
      const negativeStockCount = await Product.countDocuments({ stock: { $lt: 0 } });

      if (negativeStockCount > 0) {
        if (process.env.NODE_ENV === 'production' && !(global as any).negativeStockAlerted) {
          const { AlertingService } = require('../../services/AlertingService');
          AlertingService.inventoryAnomaly('Negative Stock Detected during Health Check', {
            count: negativeStockCount,
          }).catch(() => {});
          (global as any).negativeStockAlerted = true;
        }
      } else {
        (global as any).negativeStockAlerted = false;
      }

      checks.inventory = {
        status: negativeStockCount > 0 ? 'degraded' : 'healthy',
        negativeStockProducts: negativeStockCount,
      };
    } catch (err: any) {
      checks.inventory = { status: 'error', error: err.message };
    }

    // Refund Backlog
    try {
      const RefundRecord = require('../../models/RefundRecord').default;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const stalePendingCount = await RefundRecord.countDocuments({
        status: 'pending',
        createdAt: { $lt: twentyFourHoursAgo },
      });
      checks.refunds = {
        status: stalePendingCount > 0 ? 'degraded' : 'healthy',
        stalePendingCount,
      };
    } catch (err: any) {
      checks.refunds = { status: 'error', error: err.message };
    }

    // Circuit Breakers
    try {
      const {
        razorpayCircuitBreaker,
        emailCircuitBreaker,
        cloudinaryCircuitBreaker,
        aiVisionCircuitBreaker,
      } = require('../../utils/CircuitBreaker');
      checks.circuitBreakers = {
        razorpay: razorpayCircuitBreaker.getStatus(),
        email: emailCircuitBreaker.getStatus(),
        cloudinary: cloudinaryCircuitBreaker.getStatus(),
        aiVision: aiVisionCircuitBreaker.getStatus(),
      };
      const anyOpen = [
        razorpayCircuitBreaker,
        emailCircuitBreaker,
        cloudinaryCircuitBreaker,
        aiVisionCircuitBreaker,
      ].some((cb: any) => cb.getState() === 'OPEN');
      if (anyOpen) {
        checks.circuitBreakers.status = 'degraded';
      } else {
        checks.circuitBreakers.status = 'healthy';
      }
    } catch (err: any) {
      checks.circuitBreakers = { status: 'error', error: err.message };
    }

    // Webhook Dead-Letter Backlog
    try {
      const PaymentWebhookEvent = require('../../models/PaymentWebhookEvent').default;
      const deadLetterCount = await PaymentWebhookEvent.countDocuments({ status: 'dead_letter' });
      const stuckProcessingCount = await PaymentWebhookEvent.countDocuments({
        status: 'processing',
        lastAttemptAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
      });
      checks.webhookDeadLetter = {
        status: deadLetterCount > 0 || stuckProcessingCount > 0 ? 'degraded' : 'healthy',
        deadLetterCount,
        stuckProcessingCount,
      };
    } catch (err: any) {
      checks.webhookDeadLetter = { status: 'error', error: err.message };
    }

    // System
    const memUsage = process.memoryUsage();
    checks.system = {
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      env: process.env.NODE_ENV || 'development',
    };

    const allHealthy =
      checks.mongodb?.status === 'connected' &&
      checks.tempDisk?.status !== 'degraded' &&
      checks.outbox?.status !== 'degraded' &&
      checks.inventory?.status !== 'degraded' &&
      checks.refunds?.status !== 'degraded' &&
      checks.circuitBreakers?.status !== 'degraded' &&
      checks.webhookDeadLetter?.status !== 'degraded';

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  /**
   * GET /health/metrics — Prometheus metrics endpoint.
   * Exports system and business metrics for scraping.
   */
  static async metrics(req: Request, res: Response) {
    try {
      const { MetricsService } = require('../../services/MetricsService');
      const metrics = await MetricsService.reportHourlyMetrics();

      let prometheusOutput = '# HELP eventdecor_uptime_seconds Server uptime in seconds.\n';
      prometheusOutput += '# TYPE eventdecor_uptime_seconds gauge\n';
      prometheusOutput += `eventdecor_uptime_seconds ${Math.floor(process.uptime())}\n\n`;

      if (metrics) {
        prometheusOutput +=
          '# HELP eventdecor_orders_total Total orders created in the last hour.\n';
        prometheusOutput += '# TYPE eventdecor_orders_total gauge\n';
        prometheusOutput += `eventdecor_orders_total ${metrics.business.newOrders || 0}\n\n`;

        prometheusOutput +=
          '# HELP eventdecor_orders_failed Total failed orders in the last hour.\n';
        prometheusOutput += '# TYPE eventdecor_orders_failed gauge\n';
        prometheusOutput += `eventdecor_orders_failed ${metrics.failures.failedOrders || 0}\n\n`;

        prometheusOutput +=
          '# HELP eventdecor_payment_failure_rate_percent Order payment failure rate percentage.\n';
        prometheusOutput += '# TYPE eventdecor_payment_failure_rate_percent gauge\n';
        prometheusOutput += `eventdecor_payment_failure_rate_percent ${metrics.rates.orderFailureRate || 0}\n\n`;

        prometheusOutput += '# HELP eventdecor_outbox_backlog Current outbox backlog depth.\n';
        prometheusOutput += '# TYPE eventdecor_outbox_backlog gauge\n';
        prometheusOutput += `eventdecor_outbox_backlog ${metrics.operations.pendingOutbox || 0}\n\n`;

        prometheusOutput +=
          '# HELP eventdecor_outbox_oldest_age_minutes Age of oldest pending outbox event.\n';
        prometheusOutput += '# TYPE eventdecor_outbox_oldest_age_minutes gauge\n';
        prometheusOutput += `eventdecor_outbox_oldest_age_minutes ${metrics.operations.oldestOutboxAgeMinutes || 0}\n\n`;

        prometheusOutput +=
          '# HELP eventdecor_webhook_latency_ms Average webhook processing latency.\n';
        prometheusOutput += '# TYPE eventdecor_webhook_latency_ms gauge\n';
        prometheusOutput += `eventdecor_webhook_latency_ms ${metrics.operations.avgWebhookLatencyMs || 0}\n\n`;

        prometheusOutput +=
          '# HELP eventdecor_inventory_reservation_hit_rate Inventory reservation hit rate.\n';
        prometheusOutput += '# TYPE eventdecor_inventory_reservation_hit_rate gauge\n';
        prometheusOutput += `eventdecor_inventory_reservation_hit_rate ${metrics.rates.reservationHitRate || 0}\n\n`;
      }

      res.set('Content-Type', 'text/plain');
      res.send(prometheusOutput);
    } catch (err: any) {
      logger.error('Failed to generate Prometheus metrics:', err);
      res
        .status(500)
        .send('# HELP eventdecor_error Error generating metrics\neventdecor_error 1\n');
    }
  }
}
