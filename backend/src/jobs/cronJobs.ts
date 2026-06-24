import type * as CronTypes from 'node-cron';
const cron = require('node-cron') as typeof CronTypes.default;
import logger from '../config/logger';
import ContentSection from '../models/ContentSection';
import { FailedEmailRetryService } from '../services/failedEmailRetryService';
import { withCronLock } from '../utils/cronLock';
import { releaseStalePendingOrders } from './staleOrderCleanup';
import { releaseStalePendingRentals } from './rentalCronJobs';
import { PaymentReconciliationService } from '../services/paymentReconciliationService';
import { checkCloudinaryCdn } from '../utils/cdnHealth';
import { getAdminEmails } from '../config/adminConfig';
import { recommendationQueue } from './queues';
import { InventoryService } from '../services/InventoryService';
import { WebhookDeadLetterService } from '../services/WebhookDeadLetterService';
import { initHealthMonitorJob } from './healthMonitorJob';
import { initBackupJobs } from './backupJob';
import { initDataMonitorJob } from './DataMonitorJob';

export const initJobs = () => {
  if (process.env.ENABLE_CRON === 'false') {
    logger.info('? Background cron jobs are disabled locally (ENABLE_CRON=false)');
    return;
  }

  // 1. Cleanup Draft Revisions every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    await withCronLock('cms-revision-cleanup', 3600, async () => {
      logger.info('Running weekly CMS revision cleanup...');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await ContentSection.updateMany(
        {},
        { $pull: { revisionHistory: { modifiedAt: { $lt: thirtyDaysAgo } } } },
      );
      logger.info('CMS revision cleanup completed.');
    });
  });

  // 2. Release stock for stale pending orders and rentals (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    await withCronLock(
      'stale-order-stock-release',
      14 * 60,
      async () => {
        const count = await releaseStalePendingOrders();
        if (count > 0) {
          logger.info(`[CRON] Released stock for ${count} stale pending order(s)`);
        }

        const rentalResult = await releaseStalePendingRentals();
        if (rentalResult.processed > 0) {
          logger.info(
            `[CRON] Released stock for ${rentalResult.processed} stale pending rental(s)`,
          );
        }
      },
      15 * 60,
    );
  });

  // 2.a.1 Flush batched product view counters (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    await withCronLock('flush-view-counters', 4 * 60, async () => {
      const { default: ProductService } = require('../services/productService');
      await ProductService.flushAllViewCounters();
    });
  });

  // 2.b Sweep expired TTL inventory reservations (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    await withCronLock(
      'inventory-sweep-expired',
      4 * 60,
      async () => {
        const sweptCount = await InventoryService.sweepExpiredReservations();
        if (sweptCount > 0) {
          logger.info(`[CRON] Swept ${sweptCount} expired inventory reservation(s)`);
        }
      },
      5 * 60,
    );
  });

  // 2.c Inventory Reconciliation (every 30 minutes)
  cron.schedule('*/30 * * * *', async () => {
    await withCronLock(
      'inventory-reconciliation',
      25 * 60,
      async () => {
        const {
          InventoryReconciliationService,
        } = require('../services/InventoryReconciliationService');
        await InventoryReconciliationService.reconcileStockCounts();
      },
      30 * 60,
    );
  });

  // Outbox Processor is now handled via BullMQ Repeatable Jobs (Distributed)
  const { systemQueue, isQueuesReady } = require('./queues');
  if (isQueuesReady()) {
    systemQueue
      .add(
        'process-outbox',
        {},
        {
          repeat: { every: 10000 }, // Every 10 seconds
          jobId: 'repeatable-outbox-processor',
        },
      )
      .catch((err: any) =>
        logger.error(`[CRON] Failed to register outbox repeatable job: ${err.message}`),
      );
  }

  // Webhook Dead-Letter Processor (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    await withCronLock(
      'webhook-dead-letter',
      4 * 60,
      async () => {
        await WebhookDeadLetterService.processDeadLetters();
      },
      5 * 60,
    );
  });

  // 3. Retry failed transactional emails (dead-letter queue)
  cron.schedule('*/2 * * * *', async () => {
    await withCronLock('email-dlq-retry', 110, async () => {
      const result = await FailedEmailRetryService.processDueRetries();
      if (result.processed > 0) {
        logger.info(
          `[EMAIL DLQ] Processed ${result.processed} jobs — ${result.succeeded} succeeded, ${result.failed} failed/exhausted`,
        );
      }
    });
  });

  // 4. Reconcile admin roles with ADMIN_EMAIL config (daily at 03:00)
  cron.schedule('0 3 * * *', async () => {
    await withCronLock('admin-role-reconcile', 3600, async () => {
      // DISABLED: This conflicts with dynamic team invitations by reverting non-env admins to 'user'.
      // const result = await AdminRoleReconciliationService.reconcile();
      // if (result.upgraded > 0 || result.downgraded > 0) {
      //   logger.info(`[ADMIN RECONCILE] Upgraded: ${result.upgraded}, Downgraded: ${result.downgraded}`);
      // }
      logger.info('[ADMIN RECONCILE] Skipping reconciliation to preserve dynamic team roles.');
    });
  });

  // 5. Daily Health Heartbeat
  cron.schedule('0 9 * * *', () => {
    logger.info('☀️ Daily server heartbeat: System is healthy.');
  });

  // 6. Payment & Refund reconciliation (Hourly)
  cron.schedule('0 * * * *', async () => {
    await withCronLock(
      'payment-reconciliation',
      55 * 60,
      async () => {
        const report = await PaymentReconciliationService.runReport();
        if (report.discrepancyCount > 0) {
          logger.error(
            `[PAYMENT RECONCILE] ${report.discrepancyCount} discrepancy(ies) — see /api/analytics/payments/reconciliation`,
          );
          const { sendDirectEmail } = require('../services/notificationService');
          const recipients = getAdminEmails();
          for (const email of recipients) {
            await sendDirectEmail({
              email,
              subject: `[ALERT] Payment Discrepancies Detected (${report.discrepancyCount})`,
              customHtml: `<p>Payment Reconciliation detected <strong>${report.discrepancyCount}</strong> discrepancy(ies).</p><p>Please check the admin dashboard for details.</p>`,
              type: 'system',
              action: 'admin_reconciliation_alert',
            });
          }
        } else {
          logger.info('[PAYMENT RECONCILE] No discrepancies detected.');
        }

        const recoveredCount = await PaymentReconciliationService.autoRecoverOrphanedOrders();
        if (recoveredCount > 0) {
          logger.info(
            `[PAYMENT RECONCILE] Auto-recovered ${recoveredCount} orphaned Razorpay orders`,
          );
        }

        const cancelledCount = await PaymentReconciliationService.autoCancelAbandonedOrders();
        if (cancelledCount > 0) {
          logger.info(`[PAYMENT RECONCILE] Auto-cancelled ${cancelledCount} abandoned orders`);
        }

        // Run deep reconciliation from Razorpay to Database
        try {
          const { runPaymentReconciliation } = require('./PaymentReconciliationJob');
          await runPaymentReconciliation();
        } catch (err) {
          logger.error('[PAYMENT RECONCILE] Failed to run Razorpay deep reconciliation:', err);
        }

        // Process stuck refunds
        try {
          const { PaymentRefundService } = require('../services/PaymentRefundService');
          const stuckRefunds = await PaymentRefundService.processPendingRefunds();
          if (stuckRefunds > 0) {
            logger.info(`[PAYMENT RECONCILE] Auto-processed ${stuckRefunds} stuck pending refunds`);
          }
        } catch (err) {
          logger.error('[PAYMENT RECONCILE] Failed to process pending refunds:', err);
        }
      },
      60 * 60,
    );
  });

  // 7. CDN delivery probe (every 30 minutes; logs only on state change via cdnHealth util)
  cron.schedule('*/30 * * * *', async () => {
    await withCronLock('cdn-health-check', 25 * 60, async () => {
      await checkCloudinaryCdn({ force: true });
    });
  });

  // 8. Weekly backup health reminder (log + admin email)
  cron.schedule('0 6 * * 1', async () => {
    await withCronLock('weekly-backup-reminder', 3600, async () => {
      const atlasUri = process.env.MONGO_URI || '';
      const usesAtlas = atlasUri.includes('mongodb.net') || atlasUri.includes('mongodb+srv');
      const message = usesAtlas
        ? 'Verify MongoDB Atlas continuous backup / PITR is enabled in the Atlas project dashboard (Backup → Backup Policy).'
        : 'MONGO_URI is not Atlas-hosted — document and test your provider backup RTO/RPO manually.';

      if (usesAtlas) {
        logger.info(`[BACKUP] Weekly reminder: ${message}`);
      } else {
        logger.warn(`[BACKUP] ${message}`);
      }

      const recipients = getAdminEmails();
      if (recipients.length === 0) {
        logger.warn('[BACKUP] No admin emails configured — skipping backup reminder email');
        return;
      }

      try {
        const { sendDirectEmail } = require('../services/notificationService');
        for (const email of recipients) {
          await sendDirectEmail({
            email,
            subject: `[Siri Arts] Weekly database backup check — ${usesAtlas ? 'Atlas' : 'non-Atlas'}`,
            customHtml: `<p>${message}</p><p>Timestamp: ${new Date().toISOString()}</p>`,
            type: 'system',
            action: 'backup_weekly_reminder',
          });
        }
      } catch (err) {
        logger.error('[BACKUP] Failed to send weekly backup reminder email:', err);
      }
    });
  });

  // 9. Recommendation: Update trending rankings (daily)
  cron.schedule('0 0 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-trending-update', 14 * 60, async () => {
      try {
        await recommendationQueue.add(
          'update-trending',
          { type: 'update-trending' },
          { priority: 3 },
        );
        logger.info('[CRON] Enqueued recommendation trending update');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue trending update: ${err.message}`);
      }
    });
  });

  // 10. Recommendation: Rebuild stale user profiles and active user feeds (daily)
  cron.schedule('0 0 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-profile-rebuild', 5 * 60 * 60, async () => {
      try {
        await recommendationQueue.add(
          'rebuild-stale-profiles',
          { type: 'rebuild-stale-profiles' },
          { priority: 5 },
        );
        await recommendationQueue.add(
          'precompute-active-users-feeds',
          { type: 'precompute-active-users-feeds' },
          { priority: 6 },
        );
        logger.info('[CRON] Enqueued stale profile rebuild and active user feed precomputations');
      } catch (err: any) {
        logger.error(
          `[CRON] Failed to enqueue profile rebuild / active user feeds: ${err.message}`,
        );
      }
    });
  });

  // 11. Recommendation: Seasonal context check (daily at midnight IST = 18:30 UTC)
  cron.schedule('30 18 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-seasonal-update', 3600, async () => {
      try {
        await recommendationQueue.add(
          'update-seasonal-context',
          { type: 'update-seasonal-context' },
          { priority: 5 },
        );
        logger.info('[CRON] Enqueued seasonal context update');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue seasonal update: ${err.message}`);
      }
    });
  });

  // 12. Recommendation: Take trending snapshot (daily)
  cron.schedule('0 0 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-trending-snapshot', 55 * 60, async () => {
      try {
        await recommendationQueue.add(
          'snapshot-trending',
          { type: 'snapshot-trending' },
          { priority: 8 },
        );
        logger.info('[CRON] Enqueued trending snapshot');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue trending snapshot: ${err.message}`);
      }
    });
  });

  // 13. Recommendation: Catalog recommendations precomputation (daily at 2:00 AM UTC)
  cron.schedule('0 2 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-catalog-precompute', 60 * 60, async () => {
      try {
        await recommendationQueue.add(
          'precompute-catalog-recommendations',
          { type: 'precompute-catalog-recommendations' },
          { priority: 7 },
        );
        logger.info('[CRON] Enqueued catalog recommendations precomputation');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue catalog precomputation: ${err.message}`);
      }
    });
  });

  // 14. Database Backup (daily, weekly, monthly managed via backupJob)
  initBackupJobs();

  // 15. Business Metrics Reporting (Hourly)
  cron.schedule('0 * * * *', async () => {
    await withCronLock('metrics-hourly-report', 55 * 60, async () => {
      const { MetricsService } = require('../services/MetricsService');
      await MetricsService.reportHourlyMetrics();
    });
  });

  // 16. Orphan Asset Detection (Weekly, Sunday at 4:00 AM)
  cron.schedule('0 4 * * 0', async () => {
    await withCronLock('orphan-asset-detection', 3600, async () => {
      const { detectOrphanedAssets } = require('./orphanAssetCleanup');
      await detectOrphanedAssets();
    });
  });

  // 17. Fallback Queue Cleanup (daily at 5:00 AM — remove completed jobs older than 24h)
  cron.schedule('0 5 * * *', async () => {
    await withCronLock('fallback-queue-cleanup', 3600, async () => {
      const { QueueFallbackService } = require('../services/QueueFallbackService');
      const cleaned = await QueueFallbackService.cleanupCompletedJobs();
      if (cleaned > 0) {
        logger.info(`[CRON] Cleaned up ${cleaned} completed fallback queue jobs`);
      }
    });
  });

  // 18. Recover pending fallback queue jobs on startup (one-shot, immediate)
  (async () => {
    try {
      const { QueueFallbackService } = require('../services/QueueFallbackService');
      const recovered = await QueueFallbackService.recoverPendingJobs();
      if (recovered > 0) {
        logger.info(`[STARTUP] Recovered ${recovered} pending fallback queue jobs from MongoDB`);
      }
    } catch (err: any) {
      logger.error(`[STARTUP] Failed to recover fallback queue jobs: ${err.message}`);
    }
  })();

  // 19. Initialize Health Monitor Job
  initHealthMonitorJob();

  // 20. Initialize Real-Time Data Drop Monitor
  initDataMonitorJob();

  logger.info('⏰ Background jobs initialized (distributed locks active when REDIS_URL is set)');
};
