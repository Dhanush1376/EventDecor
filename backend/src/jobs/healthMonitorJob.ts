import type * as CronTypes from 'node-cron';
const cron = require('node-cron') as typeof CronTypes.default;
import Product from '../models/Product';
import User from '../models/User';
import logger from '../config/logger';
import { sendEmail } from '../utils/email/sendEmail';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

let lastProductCount = -1;
let lastAdminCount = -1;

export const initHealthMonitorJob = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('[HEALTH MONITOR] Running database integrity checks...');
    try {
      const currentProductCount = await Product.countDocuments();
      const currentAdminCount = await User.countDocuments({
        role: { $in: ['admin', 'owner', 'super_admin'] },
      });

      // First run initialization
      if (lastProductCount === -1) {
        lastProductCount = currentProductCount;
        lastAdminCount = currentAdminCount;
        return;
      }

      let alertTriggered = false;
      let alertMessage = '';

      // Check for sudden 10% drop in products
      if (lastProductCount > 0 && currentProductCount < lastProductCount * 0.9) {
        alertMessage += `CRITICAL: Product count dropped from ${lastProductCount} to ${currentProductCount} (more than 10%).\n`;
        alertTriggered = true;
      }

      // Check for sudden drop in admins
      if (lastAdminCount > 0 && currentAdminCount < lastAdminCount) {
        alertMessage += `WARNING: Admin count dropped from ${lastAdminCount} to ${currentAdminCount}.\n`;
        alertTriggered = true;
      }

      if (alertTriggered) {
        logger.error(`[HEALTH MONITOR] Anomalies detected:\n${alertMessage}`);
        await handleAnomaly(alertMessage);
      }

      lastProductCount = currentProductCount;
      lastAdminCount = currentAdminCount;
    } catch (err: any) {
      logger.error(`[HEALTH MONITOR] Failed to run integrity checks: ${err.message}`);
    }
  });
};

const handleAnomaly = async (message: string) => {
  // 1. Send Email Alert
  const alertEmail = process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  if (alertEmail) {
    try {
      await sendEmail({
        email: alertEmail,
        subject: 'URGENT: Database Integrity Alert - Siri Arts & Crafts',
        message: `The health monitor has detected anomalous database activity:\n\n${message}\n\nAn emergency backup has been triggered. Please review the system immediately.`,
      });
      logger.info(`[HEALTH MONITOR] Alert email sent to ${alertEmail}`);
    } catch (err: any) {
      logger.error(`[HEALTH MONITOR] Failed to send alert email: ${err.message}`);
    }
  }

  // 2. Trigger Emergency Backup
  triggerEmergencyBackup();
};

const triggerEmergencyBackup = () => {
  try {
    const backupDir = path.join(process.cwd(), 'recovery', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `emergency-db-backup-${timestamp}.gzip`);
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) return;

    const command = `mongodump --uri="${mongoUri}" --archive="${backupFile}" --gzip`;
    exec(command, (error, _stdout, _stderr) => {
      if (error) {
        logger.error(`[HEALTH MONITOR] Emergency backup failed: ${error.message}`);
        return;
      }
      logger.info(`[HEALTH MONITOR] Emergency backup created at ${backupFile}`);
    });
  } catch (err: any) {
    logger.error(`[HEALTH MONITOR] Emergency backup trigger error: ${err.message}`);
  }
};
