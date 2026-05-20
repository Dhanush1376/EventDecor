import { emailQueue } from '../queues/emailQueue';
import { EmailOptions } from './notificationService';
import logger from '../config/logger';

class EmailQueueManager {
  /**
   * Pushes an email to the background BullMQ queue and returns immediately.
   */
  public enqueue(options: EmailOptions) {
    emailQueue.add('send-email', options).catch((err) => {
      logger.error(`[EmailQueue] Failed to add email job to BullMQ queue: ${err.message}`);
      // Fallback: If Redis is down, we attempt to process directly to avoid losing critical emails
      const { sendDirectEmailProcessor } = require('./notificationService');
      sendDirectEmailProcessor(options).catch((directErr: any) => {
         logger.error(`[EmailQueue] Direct fallback also failed: ${directErr.message}`);
      });
    });
    logger.debug(`[EmailQueue] Enqueued email to ${options.email} (Type: ${options.type}) via BullMQ`);
  }
}

// Export singleton instance
export const legacyEmailQueueWrapper = new EmailQueueManager();
// To prevent breaking changes, we export it with the old name
export { legacyEmailQueueWrapper as emailQueue };
