import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger';

export const initDailyBackupJob = () => {
  // Run every night at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('[BACKUP] Starting automated daily database backup...');
    try {
      const backupDir = path.join(process.cwd(), 'recovery', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `db-backup-${timestamp}.gzip`);
      const mongoUri = process.env.MONGO_URI;

      if (!mongoUri) {
        throw new Error('MONGO_URI is not defined, cannot perform backup.');
      }

      // mongodump command
      const command = `mongodump --uri="${mongoUri}" --archive="${backupFile}" --gzip`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`[BACKUP] mongodump error: ${error.message}`);
          return;
        }
        if (stderr) {
          logger.info(`[BACKUP] mongodump output: ${stderr}`);
        }
        logger.info(`[BACKUP] Database successfully backed up to ${backupFile}`);

        // Retention policy: Keep only last 7 days of backups
        cleanupOldBackups(backupDir, 7);
      });
    } catch (err: any) {
      logger.error(`[BACKUP] Failed to execute daily backup job: ${err.message}`);
    }
  });
};

const cleanupOldBackups = (backupDir: string, daysToKeep: number) => {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAgeMs = daysToKeep * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        logger.info(`[BACKUP] Deleted old backup file: ${file}`);
      }
    }
  } catch (err: any) {
    logger.error(`[BACKUP] Failed to clean up old backups: ${err.message}`);
  }
};
