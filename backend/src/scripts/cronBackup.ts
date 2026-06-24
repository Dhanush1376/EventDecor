import type * as CronTypes from 'node-cron';
const cron = require('node-cron') as typeof CronTypes.default;
import { runDbBackup } from './backupDb';
import logger from '../config/logger';

// Schedule backup to run every day at 3:00 AM server time
// "0 3 * * *"
const SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';

logger.info(`[CRON] Initializing Database Backup Cron Job. Schedule: ${SCHEDULE}`);

cron.schedule(SCHEDULE, async () => {
  logger.info('[CRON] Executing scheduled database backup...');
  try {
    await runDbBackup();
    logger.info('[CRON] Scheduled database backup completed successfully.');
  } catch (error: any) {
    logger.error(`[CRON] Scheduled database backup failed: ${error.message}`);
  }
});
