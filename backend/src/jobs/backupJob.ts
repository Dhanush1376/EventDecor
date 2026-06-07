import cron from 'node-cron';
import logger from '../config/logger';
import { withCronLock } from '../utils/cronLock';
import { BackupService } from '../services/backupService';

export const initBackupJobs = () => {
  const backupService = new BackupService();

  // Daily Backup at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    await withCronLock('db-backup-daily', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering daily automated backup...');
      try {
        await backupService.createJsonBackup('daily');
        await backupService.createMongoDump('daily');
        await backupService.pruneOldBackups();
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Daily backup failed: ${err.message}`);
        // Consider sending an admin alert here
      }
    });
  });

  // Weekly Backup on Sunday at 4:00 AM
  cron.schedule('0 4 * * 0', async () => {
    await withCronLock('db-backup-weekly', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering weekly automated backup...');
      try {
        await backupService.createJsonBackup('weekly');
        await backupService.createMongoDump('weekly');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Weekly backup failed: ${err.message}`);
      }
    });
  });

  // Monthly Backup on the 1st of every month at 5:00 AM
  cron.schedule('0 5 1 * *', async () => {
    await withCronLock('db-backup-monthly', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering monthly automated backup...');
      try {
        await backupService.createJsonBackup('monthly');
        await backupService.createMongoDump('monthly');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Monthly backup failed: ${err.message}`);
      }
    });
  });
};
