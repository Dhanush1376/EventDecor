import { EmailOptions } from './notificationService';
import { FailedEmailRetryService } from './failedEmailRetryService';
import logger from '../config/logger';

class EmailQueueManager {
  /**
   * Processes email in the background; failed sends are persisted for cron retry.
   */
  public enqueue(options: EmailOptions) {
    const { sendDirectEmailProcessor } = require('./notificationService');
    sendDirectEmailProcessor(options).catch((err: any) => {
      const message = err?.message || 'Unknown email error';
      logger.error(
        `[EmailQueue] Dispatch failed for ${options.email} (${options.action}): ${message}`,
      );
      FailedEmailRetryService.schedule(options, message).catch((scheduleErr: any) => {
        logger.error('[EmailQueue] Failed to persist email to dead-letter queue:', scheduleErr);
      });
    });
    logger.debug(
      `[EmailQueue] Enqueued email to ${options.email} (Type: ${options.type}, Action: ${options.action})`,
    );
  }
}

export const emailQueue = new EmailQueueManager();
