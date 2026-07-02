import cron from 'node-cron';
import logger from '../config/logger';
import { withCronLock } from '../utils/cronLock';
import { RestoreManager } from '../services/backup/RestoreManager';
import BackupRecord from '../models/BackupRecord';
import { AlertingService } from '../services/AlertingService';

export const initRestoreDrills = () => {
  // Weekly on Saturday at 2:00 AM: Automated Restore Drill to Staging
  cron.schedule('0 2 * * 6', async () => {
    await withCronLock('db-restore-drill', 7200, async () => {
      logger.info('[RESTORE DRILL] Starting automated restore drill...');

      try {
        // 1. Find latest successful full backup
        const latestFull = await BackupRecord.findOne({
          type: 'full',
          status: 'completed',
        }).sort({ createdAt: -1 });

        if (!latestFull) {
          throw new Error('No successful full backup found to drill with.');
        }

        logger.info(`[RESTORE DRILL] Selected backup ${latestFull.backupId} for drill.`);

        // 2. We simulate the restore to a staging database by using a specific naming convention
        // For the purpose of the drill, we will use the existing RestoreManager,
        // but tell it this is a drill, so it uses `staging_` prefixes.

        // This is a simplified drill execution.
        // In a true environment, we'd restore to a completely different mongo URI.
        const simulation = await RestoreManager.simulateRestore(latestFull.backupId, {
          isDrill: true,
        });

        if (!simulation.canProceed) {
          throw new Error('Simulation failed compatibility checks.');
        }

        // Execute the drill restore
        await RestoreManager.executeRestore(latestFull.backupId, { force: true, isDrill: true });

        // 3. The executeRestore will run VerificationService.runSmokeTests() on the staging data internally
        logger.info(
          `[RESTORE DRILL] Successfully completed automated restore drill for ${latestFull.backupId}`,
        );
      } catch (err: any) {
        logger.error(`[RESTORE DRILL] Drill failed: ${err.message}`);
        await AlertingService.backupAlert(err, { type: 'restore_drill', schedule: 'weekly' });
      }
    });
  });
};
