const cron = require('node-cron');
import { DocumentBackupService } from '../domains/documents/services/DocumentBackupService';
import logger from '../config/logger';

export const startDocumentBackupJob = () => {
  // Run every night at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CRON] Starting nightly S3 Disaster Recovery sync');
    try {
      await DocumentBackupService.syncToDisasterRecovery();
    } catch (error) {
      logger.error('[CRON] S3 DR sync failed:', error);
    }
  });
};
