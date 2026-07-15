import logger from '../config/logger';
import { withCronLock } from '../utils/cronLock';

/**
 * Recycle Bin Auto-Purge Job
 *
 * Runs daily at 3 AM IST. Finds all recycle bin entries past their scheduled
 * purge date and permanently deletes them (MongoDB + Cloudinary + related refs).
 *
 * Uses withCronLock for distributed safety in multi-instance deployments.
 */
export const runRecycleBinAutoPurge = async () => {
  await withCronLock('recycle-bin-auto-purge', 7200, async () => {
    logger.info('[RecycleBin Auto-Purge] Starting scheduled auto-purge...');

    try {
      // Dynamic import to avoid circular dependencies at startup
      const { RecycleBinService } = require('../services/recycleBinService');
      const result = await RecycleBinService.autoPurge();

      if (result.purged > 0 || result.failed > 0) {
        logger.info(
          `[RecycleBin Auto-Purge] Completed. Purged: ${result.purged}, Failed: ${result.failed}`,
        );
      } else {
        logger.info('[RecycleBin Auto-Purge] No expired items to purge.');
      }

      if (result.errors.length > 0) {
        logger.warn(`[RecycleBin Auto-Purge] Errors: ${result.errors.join('; ')}`);
      }

      // Send admin notification if items were expiring soon
      try {
        const stats = await RecycleBinService.getStats();
        if (stats.expiringToday > 0 || stats.expiringTomorrow > 0) {
          const InAppNotification =
            require('../models/InAppNotification').default ||
            require('../models/InAppNotification');

          // Notify about items expiring soon
          const message =
            stats.expiringToday > 0
              ? `${stats.expiringToday} item(s) will be permanently deleted today.`
              : `${stats.expiringTomorrow} item(s) will be permanently deleted tomorrow.`;

          await InAppNotification.create({
            type: 'system',
            title: 'Recycle Bin: Items Expiring Soon',
            message,
            priority: 'high',
            targetRoles: ['owner', 'super_admin', 'main_admin', 'admin'],
            actionLink: '/admin/recycle-bin',
          }).catch((err: any) => {
            logger.warn(`[RecycleBin Auto-Purge] Failed to create notification: ${err.message}`);
          });
        }
      } catch (notifErr: any) {
        logger.warn(`[RecycleBin Auto-Purge] Notification check failed: ${notifErr.message}`);
      }
    } catch (err: any) {
      logger.error(`[RecycleBin Auto-Purge] Job failed: ${err.message}`, err);
    }
  });
};
