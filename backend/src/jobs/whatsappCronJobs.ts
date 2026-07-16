import cron from 'node-cron';
import { WhatsAppAutomationEngine } from '../domains/notifications/whatsapp/WhatsAppAutomationEngine';
import { EscalationMonitor } from '../domains/notifications/whatsapp/EscalationMonitor';
import { WhatsAppDashboardService } from '../domains/notifications/whatsapp/WhatsAppDashboardService';
import logger from '../config/logger';
import WhatsAppMessageLog from '../models/WhatsAppMessageLog';
import { MessageLifecycleService } from '../domains/notifications/whatsapp/MessageLifecycleService';

export const startWhatsAppCronJobs = () => {
  logger.info('[WhatsAppCron] Starting WhatsApp background cron jobs');

  // Daily Summary — every day at 10:00 PM IST
  cron.schedule('0 22 * * *', () => {
    WhatsAppAutomationEngine.trigger('daily_summary', {});
  });

  // Weekly Summary — every Monday at 10:00 AM IST
  cron.schedule('0 10 * * 1', () => {
    WhatsAppAutomationEngine.trigger('weekly_summary', {});
  });

  // Monthly Summary — 1st of every month at 10:00 AM IST
  cron.schedule('0 10 1 * *', () => {
    WhatsAppAutomationEngine.trigger('monthly_summary', {});
  });

  // Escalation Monitor — every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    EscalationMonitor.checkUnprocessedOrders();
  });

  // Dashboard Stats Refresh — every minute
  cron.schedule('* * * * *', () => {
    WhatsAppDashboardService.refreshCache();
  });

  // Provider Health Check — every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    WhatsAppDashboardService.checkProviderHealth();
  });

  // Expiry & Orphan Sweeper — every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[WhatsAppCron] Running TTL Expiry Sweeper for stuck messages...');
    try {
      const now = new Date();

      // Find messages stuck in pending, queued, or processing past their expiresAt
      const stuckMessages = await WhatsAppMessageLog.find({
        deliveryStatus: { $in: ['pending', 'queued', 'processing'] },
        expiresAt: { $lt: now },
      })
        .select('messageId deliveryStatus expiresAt')
        .lean();

      if (stuckMessages.length > 0) {
        logger.info(
          `[WhatsAppCron] Found ${stuckMessages.length} expired messages. Cleaning up...`,
        );
        let swept = 0;
        for (const msg of stuckMessages) {
          try {
            await MessageLifecycleService.transitionTo(msg.messageId, 'expired', {
              reason: 'TTL expired before successful dispatch/delivery',
              metadata: { expiredAt: now },
            });
            swept++;
          } catch (e) {
            logger.error(`[WhatsAppCron] Failed to expire message ${msg.messageId}`, e);
          }
        }
        logger.info(`[WhatsAppCron] Swept ${swept}/${stuckMessages.length} expired messages.`);
      }
    } catch (error) {
      logger.error('[WhatsAppCron] Error running Expiry Sweeper', error);
    }
  });
};
