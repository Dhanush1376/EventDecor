import { EmailOptions } from './notificationService';
import logger from '../config/logger';

class EmailQueueManager {
  /**
   * Directly processes the email in the background to return immediately.
   */
  public enqueue(options: EmailOptions) {
    // Run direct email dispatch in the background (non-blocking)
    const { sendDirectEmailProcessor } = require('./notificationService');
    sendDirectEmailProcessor(options).catch((err: any) => {
      logger.error(`[EmailQueue] Direct background email dispatch failed: ${err.message}`);
    });
    logger.debug(`[EmailQueue] Enqueued email to ${options.email} (Type: ${options.type}) for direct background processing`);
  }
}

// Export singleton instance
export const legacyEmailQueueWrapper = new EmailQueueManager();
// To prevent breaking changes, we export it with the old name
export { legacyEmailQueueWrapper as emailQueue };
