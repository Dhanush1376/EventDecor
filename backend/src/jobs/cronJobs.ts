import cron from 'node-cron';
import logger from '../config/logger';
import ContentSection from '../models/ContentSection';
import { FailedEmailRetryService } from '../services/failedEmailRetryService';
import { AdminRoleReconciliationService } from '../services/adminRoleReconciliationService';
import { withCronLock } from '../utils/cronLock';
import { releaseStalePendingOrders } from './staleOrderCleanup';
import { PaymentReconciliationService } from '../services/paymentReconciliationService';
import { checkCloudinaryCdn } from '../utils/cdnHealth';
import { getAdminEmails } from '../config/adminConfig';
import { recommendationQueue, isQueuesReady } from './queues';

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
        { $pull: { revisionHistory: { modifiedAt: { $lt: thirtyDaysAgo } } } }
      );
      logger.info('CMS revision cleanup completed.');
    });
  });

  // 2. Release stock for stale pending orders (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    await withCronLock('stale-order-stock-release', 14 * 60, async () => {
      const count = await releaseStalePendingOrders();
      if (count > 0) {
        logger.info(`[CRON] Released stock for ${count} stale pending order(s)`);
      }
    });
  });

  // 3. Retry failed transactional emails (dead-letter queue)
  cron.schedule('*/2 * * * *', async () => {
    await withCronLock('email-dlq-retry', 110, async () => {
      const result = await FailedEmailRetryService.processDueRetries();
      if (result.processed > 0) {
        logger.info(
          `[EMAIL DLQ] Processed ${result.processed} jobs — ${result.succeeded} succeeded, ${result.failed} failed/exhausted`
        );
      }
    });
  });

  // 4. Reconcile admin roles with ADMIN_EMAIL config (daily at 03:00)
  cron.schedule('0 3 * * *', async () => {
    await withCronLock('admin-role-reconcile', 3600, async () => {
      const result = await AdminRoleReconciliationService.reconcile();
      if (result.upgraded > 0 || result.downgraded > 0) {
        logger.info(`[ADMIN RECONCILE] Upgraded: ${result.upgraded}, Downgraded: ${result.downgraded}`);
      }
    });
  });

  // 5. Daily Health Heartbeat
  cron.schedule('0 9 * * *', () => {
    logger.info('☀️ Daily server heartbeat: System is healthy.');
  });

  // 6. Payment reconciliation (daily 04:00 UTC)
  cron.schedule('0 4 * * *', async () => {
    await withCronLock('payment-reconciliation', 3600, async () => {
      const report = await PaymentReconciliationService.runReport();
      if (report.discrepancyCount > 0) {
        logger.warn(
          `[PAYMENT RECONCILE] ${report.discrepancyCount} discrepancy(ies) — see /api/analytics/payments/reconciliation`
        );
      } else {
        logger.info('[PAYMENT RECONCILE] No discrepancies detected.');
      }
    });
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

  // 9. Recommendation: Update trending rankings every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-trending-update', 14 * 60, async () => {
      try {
        await recommendationQueue.add('update-trending', { type: 'update-trending' }, { priority: 3 });
        logger.info('[CRON] Enqueued recommendation trending update');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue trending update: ${err.message}`);
      }
    });
  });

  // 10. Recommendation: Rebuild stale user profiles every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-profile-rebuild', 5 * 60 * 60, async () => {
      try {
        await recommendationQueue.add('rebuild-stale-profiles', { type: 'rebuild-stale-profiles' }, { priority: 5 });
        logger.info('[CRON] Enqueued stale profile rebuild');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue profile rebuild: ${err.message}`);
      }
    });
  });

  // 11. Recommendation: Seasonal context check (daily at midnight IST = 18:30 UTC)
  cron.schedule('30 18 * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-seasonal-update', 3600, async () => {
      try {
        await recommendationQueue.add('update-seasonal-context', { type: 'update-seasonal-context' }, { priority: 5 });
        logger.info('[CRON] Enqueued seasonal context update');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue seasonal update: ${err.message}`);
      }
    });
  });

  // 12. Recommendation: Take trending snapshot (hourly)
  cron.schedule('0 * * * *', async () => {
    if (!isQueuesReady()) return;
    await withCronLock('reco-trending-snapshot', 55 * 60, async () => {
      try {
        await recommendationQueue.add('snapshot-trending', { type: 'snapshot-trending' }, { priority: 8 });
        logger.info('[CRON] Enqueued trending snapshot');
      } catch (err: any) {
        logger.error(`[CRON] Failed to enqueue trending snapshot: ${err.message}`);
      }
    });
  });

  logger.info('⏰ Background jobs initialized (distributed locks active when REDIS_URL is set)');
};
