import { sendDirectEmailProcessor, EmailOptions } from './notificationService';
import logger from '../config/logger';

interface QueueItem {
  options: EmailOptions;
  retries: number;
}

class EmailQueueManager {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private readonly MAX_RETRIES = 3;

  /**
   * Pushes an email to the background queue and returns immediately.
   */
  public enqueue(options: EmailOptions) {
    this.queue.push({ options, retries: 0 });
    logger.debug(`[EmailQueue] Enqueued email to ${options.email} (Type: ${options.type})`);
    
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Processes the queue asynchronously without blocking the Node.js event loop.
   */
  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await sendDirectEmailProcessor(item.options);
      } catch (err: any) {
        logger.error(`[EmailQueue] Failed to send email to ${item.options.email}:`, err);
        
        if (item.retries < this.MAX_RETRIES) {
          item.retries += 1;
          logger.info(`[EmailQueue] Re-queueing email to ${item.options.email} (Attempt ${item.retries}/${this.MAX_RETRIES})`);
          // Push back to queue with exponential backoff delay (simulated via array pushing to end)
          this.queue.push(item);
          // Small delay before next retry sequence
          await new Promise(resolve => setTimeout(resolve, 2000 * item.retries));
        } else {
          logger.error(`[EmailQueue] Permanently failed to send email to ${item.options.email} after ${this.MAX_RETRIES} retries.`);
        }
      }

      // 100ms throttle between emails to prevent SMTP rate-limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }
}

// Export singleton instance
export const emailQueue = new EmailQueueManager();
