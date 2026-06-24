const cron = require('node-cron');
import logger from '../config/logger';
import { withCronLock } from '../utils/cronLock';
import { BackupService } from '../services/backupService';
import { verifyBackupIntegrity } from './backupVerification';
import { AlertingService } from '../services/AlertingService';

export const initBackupJobs = () => {
  const backupService = new BackupService();

  // Daily Backup at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    await withCronLock('db-backup-daily', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering daily automated backup...');
      try {
        const backupDir = await backupService.createJsonBackup('daily');
        await verifyBackupIntegrity(backupDir);
        await backupService.createMongoDump('daily');
        await backupService.pruneOldBackups();
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Daily backup failed: ${err.message}`);
        await AlertingService.backupAlert('Daily Backup Failed', {
          error: err.message,
          type: 'daily',
        }).catch((e) => logger.error('Alert dispatch failed:', e));
      }
    });
  });

  // Weekly Backup on Sunday at 4:00 AM
  cron.schedule('0 4 * * 0', async () => {
    await withCronLock('db-backup-weekly', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering weekly automated backup...');
      try {
        const backupDir = await backupService.createJsonBackup('weekly');
        await verifyBackupIntegrity(backupDir);
        await backupService.createMongoDump('weekly');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Weekly backup failed: ${err.message}`);
        await AlertingService.backupAlert('Weekly Backup Failed', {
          error: err.message,
          type: 'weekly',
        }).catch((e) => logger.error('Alert dispatch failed:', e));
      }
    });
  });

  // Monthly Backup on the 1st of every month at 5:00 AM
  cron.schedule('0 5 1 * *', async () => {
    await withCronLock('db-backup-monthly', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering monthly automated backup...');
      try {
        const backupDir = await backupService.createJsonBackup('monthly');
        await verifyBackupIntegrity(backupDir);
        await backupService.createMongoDump('monthly');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Monthly backup failed: ${err.message}`);
        await AlertingService.backupAlert('Monthly Backup Failed', {
          error: err.message,
          type: 'monthly',
        }).catch((e) => logger.error('Alert dispatch failed:', e));
      }
    });
  });
};
