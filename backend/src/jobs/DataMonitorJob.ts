const cron = require('node-cron');
import mongoose from 'mongoose';
import logger from '../config/logger';
import { withCronLock } from '../utils/cronLock';
import { getAdminEmails } from '../config/adminConfig';
import { BackupService } from '../services/backupService';
import { redisClient } from '../utils/cache/redis';

export const initDataMonitorJob = () => {
  const backupService = new BackupService();

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await withCronLock('data-drop-monitor', 4 * 60, async () => {
      try {
        const collectionsToMonitor = [
          'products',
          'users',
          'orders',
          'inventoryledgers',
          'customorders',
        ];

        let emergencyTriggered = false;
        const dropsDetected: string[] = [];

        for (const collName of collectionsToMonitor) {
          const collection = mongoose.connection.collection(collName);
          const currentCount = await collection.countDocuments();
          const redisKey = `monitor:count:${collName}`;

          if (redisClient && redisClient.isReady) {
            const prevCountStr = await redisClient.get(redisKey);
            if (prevCountStr) {
              const prevCount = parseInt(prevCountStr, 10);

              // Define a drop threshold (e.g. 5% drop or more than 100 items at once)
              // Adjust these thresholds based on business logic
              const dropAmount = prevCount - currentCount;
              const dropPercentage = (dropAmount / prevCount) * 100;

              if (dropAmount > 0 && (dropPercentage > 5 || dropAmount > 50)) {
                const alertMsg = `Sudden drop detected in ${collName}: ${prevCount} -> ${currentCount} (Dropped by ${dropAmount})`;
                logger.error(`[DATA MONITOR] ${alertMsg}`);
                dropsDetected.push(alertMsg);
                emergencyTriggered = true;
              }
            }
            // Update the count in redis for the next check
            await redisClient.set(redisKey, currentCount.toString(), { EX: 3600 }); // expire in 1 hr if not updated
          }
        }

        if (emergencyTriggered) {
          logger.error(
            '[DATA MONITOR] Mass deletion signature detected! Taking emergency actions...',
          );

          // 1. Trigger emergency backup snapshot
          const reason = `Mass deletion signature: ${dropsDetected.join(' | ')}`;
          await backupService.createEmergencySnapshot(reason);

          // 2. Fire alerts
          const recipients = getAdminEmails();
          if (recipients.length > 0) {
            const { sendDirectEmail } = require('../services/notificationService');
            for (const email of recipients) {
              await sendDirectEmail({
                email,
                subject: `[CRITICAL SECURITY ALERT] Mass Data Deletion Detected`,
                customHtml: `
                  <h2 style="color: red;">CRITICAL ALERT: Mass Deletion Detected</h2>
                  <p>Our real-time monitoring has detected a catastrophic drop in database records.</p>
                  <ul>
                    ${dropsDetected.map((d) => `<li>${d}</li>`).join('')}
                  </ul>
                  <p><strong>Action Taken:</strong> An emergency snapshot has been triggered and saved locally to prevent further data loss.</p>
                  <p>Please investigate immediately!</p>
                `,
                type: 'system',
                action: 'security_mass_deletion_alert',
              }).catch(() => {});
            }
          }
        }
      } catch (err: any) {
        logger.error(`[DATA MONITOR] Failed to run data monitor check: ${err.message}`);
      }
    });
  });
};
