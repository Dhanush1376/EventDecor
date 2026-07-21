import logger from '../config/logger';
import { NotificationEngine } from '../services/notifications/NotificationEngine';
import { NotificationEvent } from '../services/notifications/types';
import { withCronLock } from '../utils/cronLock';

export const initDigestJobs = async () => {
  const cron = await import('node-cron');

  // Daily Sales Report - Runs at 11:55 PM every day
  cron.default.schedule('55 23 * * *', async () => {
    await withCronLock('daily-sales-digest', 60, async () => {
      try {
        logger.info('[DIGEST JOBS] Generating Daily Sales Report...');

        // Stub: Calculate today's stats
        const todayStats = {
          date: new Date().toISOString().split('T')[0],
          grossRevenue: 15400,
          netRevenue: 12000,
          orderCount: 8,
          topProducts: ['Hand-painted Vase', 'Ceramic Bowl'],
        };

        await NotificationEngine.notify(NotificationEvent.DAILY_SALES_REPORT, {
          eventId: 'DIGEST_DAILY',
          aggregateId: 'SYSTEM',
          priority: 'low',
          retryCount: 0,
          metadata: { payload: todayStats },
        });

        logger.info('[DIGEST JOBS] Daily Sales Report generated successfully.');
      } catch (error) {
        logger.error('[DIGEST JOBS] Failed to generate Daily Sales Report:', error);
      }
    });
  });

  // Weekly Sales Report - Runs Sunday at 11:59 PM
  cron.default.schedule('59 23 * * 0', async () => {
    await withCronLock('weekly-sales-digest', 60, async () => {
      try {
        logger.info('[DIGEST JOBS] Generating Weekly Report...');

        // Stub: Calculate weekly stats
        const weeklyStats = {
          week: 'W' + Math.ceil(new Date().getDate() / 7) + ' ' + new Date().getFullYear(),
          grossRevenue: 124000,
          orderCount: 64,
          failedPayments: 3,
          newUsers: 15,
        };

        await NotificationEngine.notify(NotificationEvent.WEEKLY_REPORT, {
          eventId: 'DIGEST_WEEKLY',
          aggregateId: 'SYSTEM',
          priority: 'low',
          retryCount: 0,
          metadata: { payload: weeklyStats },
        });
      } catch (error) {
        logger.error('[DIGEST JOBS] Failed to generate Weekly Report:', error);
      }
    });
  });

  // Monthly Analytics Report - Runs 1st of every month at 1:00 AM
  cron.default.schedule('0 1 1 * *', async () => {
    await withCronLock('monthly-analytics-digest', 60, async () => {
      try {
        logger.info('[DIGEST JOBS] Generating Monthly Report...');

        const monthlyStats = {
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          grossRevenue: 540000,
          orderCount: 280,
          refundSummary: 12000,
          topCustomers: ['Alice M.', 'Bob J.'],
        };

        await NotificationEngine.notify(NotificationEvent.MONTHLY_REPORT, {
          eventId: 'DIGEST_MONTHLY',
          aggregateId: 'SYSTEM',
          priority: 'low',
          retryCount: 0,
          metadata: { payload: monthlyStats },
        });
      } catch (error) {
        logger.error('[DIGEST JOBS] Failed to generate Monthly Report:', error);
      }
    });
  });
};
