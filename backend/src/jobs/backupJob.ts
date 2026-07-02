import * as cron from 'node-cron';
import logger from '../config/logger';
import { withCronLock } from '../utils/cronLock';
import { BackupOrchestrator } from '../services/backup/BackupOrchestrator';
import { VerificationService } from '../services/backup/VerificationService';
import { BackupPlanner } from '../services/backup/BackupPlanner';
import { AlertingService } from '../services/AlertingService';

export const initBackupJobs = () => {
  // Every 6 hours: Incremental backup for PITR chain (Critical Tiers only)
  cron.schedule('0 */6 * * *', async () => {
    await withCronLock('db-backup-incremental', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering 6-hourly incremental backup...');
      try {
        await BackupOrchestrator.runBackup('incremental', 'hourly', 'cron');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Incremental backup failed: ${err.message}`);
        await AlertingService.backupAlert(err, { type: 'incremental', schedule: 'hourly' });
      }
    });
  });

  // Daily at 3:00 AM: Full Backup
  cron.schedule('0 3 * * *', async () => {
    await withCronLock('db-backup-daily', 3600, async () => {
      logger.info('[BACKUP CRON] Triggering daily full backup...');
      try {
        await BackupOrchestrator.runBackup('full', 'daily', 'cron');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Daily backup failed: ${err.message}`);
        await AlertingService.backupAlert(err, { type: 'full', schedule: 'daily' });
      }
    });
  });

  // Weekly on Sunday at 4:00 AM: Full Backup + Chaos Test
  cron.schedule('0 4 * * 0', async () => {
    await withCronLock('db-backup-weekly', 7200, async () => {
      logger.info('[BACKUP CRON] Triggering weekly full backup & verification...');
      try {
        await BackupOrchestrator.runBackup('full', 'weekly', 'cron');
        // Additional weekly tasks
        logger.info(`[BACKUP CRON] Running weekly chaos test...`);
        await VerificationService.runChaosTest('corrupted_backup');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Weekly backup failed: ${err.message}`);
        await AlertingService.backupAlert(err, { type: 'full', schedule: 'weekly' });
      }
    });
  });

  // Monthly on the 1st at 5:00 AM: Full Backup (Immutable) + Config Snapshot + Dependency Scan
  cron.schedule('0 5 1 * *', async () => {
    await withCronLock('db-backup-monthly', 7200, async () => {
      logger.info('[BACKUP CRON] Triggering monthly full backup & config snapshot...');
      try {
        // Dependency scan before monthly immutable
        const scan = await BackupPlanner.scanDependencies();
        if (!scan.passed) {
          logger.warn(
            `[BACKUP CRON] Dependency scan warnings/issues: ${JSON.stringify(scan.issues)}`,
          );
        }

        // Full backup (orchestrator handles immutability if env var is set)
        await BackupOrchestrator.runBackup('full', 'monthly', 'cron');

        // Config snapshot
        await BackupOrchestrator.runBackup('config', 'monthly', 'cron');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Monthly backup failed: ${err.message}`);
        await AlertingService.backupAlert(err, { type: 'full', schedule: 'monthly' });
      }
    });
  });

  // Yearly on Jan 1st at 6:00 AM: Yearly Archival Backup (Immutable)
  cron.schedule('0 6 1 1 *', async () => {
    await withCronLock('db-backup-yearly', 14400, async () => {
      logger.info('[BACKUP CRON] Triggering yearly archival backup...');
      try {
        await BackupOrchestrator.runBackup('full', 'yearly', 'cron');
      } catch (err: any) {
        logger.error(`[BACKUP CRON] Yearly backup failed: ${err.message}`);
        await AlertingService.backupAlert(err, { type: 'full', schedule: 'yearly' });
      }
    });
  });
};
