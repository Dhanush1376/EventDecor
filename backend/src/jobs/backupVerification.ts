import fs from 'fs';
import path from 'path';
import logger from '../config/logger';
import { AlertingService } from '../services/AlertingService';

export const verifyBackupIntegrity = async (backupDir: string): Promise<boolean> => {
  logger.info(`[BACKUP VERIFICATION] Verifying backup at ${backupDir}...`);
  try {
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup directory does not exist: ${backupDir}`);
    }

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      throw new Error(`No JSON backup files found in ${backupDir}`);
    }

    const criticalCollections = ['products', 'users', 'orders'];
    const foundCollections = files.map((f) => f.replace('.json', ''));

    for (const coll of criticalCollections) {
      if (!foundCollections.includes(coll)) {
        throw new Error(`Critical collection '${coll}' is missing from backup`);
      }
    }

    let allValid = true;
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.size === 0) {
        throw new Error(`Backup file is empty: ${file}`);
      }

      // Read the first few bytes to ensure it's a valid JSON array format
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(10);
      fs.readSync(fd, buffer, 0, 10, 0);
      fs.closeSync(fd);

      const startString = buffer.toString('utf8').trim();
      if (!startString.startsWith('[')) {
        logger.warn(
          `[BACKUP VERIFICATION] File ${file} does not start with JSON array bracket. Might be corrupted.`,
        );
        allValid = false;
      }
    }

    if (allValid) {
      logger.info(`[BACKUP VERIFICATION] Passed integrity check for ${backupDir}`);
      return true;
    } else {
      throw new Error(`Validation failed for one or more files in ${backupDir}`);
    }
  } catch (err: any) {
    logger.error(`[BACKUP VERIFICATION] Failed: ${err.message}`);
    if (process.env.NODE_ENV === 'production') {
      AlertingService.backupAlert('Backup Verification Failed', {
        error: err.message,
        path: backupDir,
      }).catch((e) => logger.error('Alert failed:', e));
    }
    return false;
  }
};
