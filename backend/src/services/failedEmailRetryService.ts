import FailedEmailJob from '../models/FailedEmailJob';
import logger from '../config/logger';
import type { EmailOptions } from './notificationService';

const RETRY_DELAYS_MS = [60_000, 120_000, 300_000]; // 1m, 2m, 5m

export class FailedEmailRetryService {
  static async schedule(options: EmailOptions, errorMessage: string) {
    const existing = await FailedEmailJob.findOne({
      status: 'pending',
      'payload.email': options.email,
      'payload.action': options.action,
    });

    if (existing) {
      existing.lastError = errorMessage;
      existing.nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[Math.min(existing.attempts, RETRY_DELAYS_MS.length - 1)]);
      await existing.save();
      logger.warn(`[EMAIL DLQ] Updated pending retry for ${options.email} (${options.action})`);
      return existing;
    }

    const job = await FailedEmailJob.create({
      payload: options as unknown as Record<string, unknown>,
      attempts: 0,
      maxAttempts: 3,
      lastError: errorMessage,
      nextRetryAt: new Date(Date.now() + RETRY_DELAYS_MS[0]),
      status: 'pending',
    });

    logger.warn(`[EMAIL DLQ] Queued failed email for retry: ${options.email} (${options.action})`);
    return job;
  }

  static async processDueRetries() {
    const now = new Date();
    const jobs = await FailedEmailJob.find({
      status: 'pending',
      nextRetryAt: { $lte: now },
    }).limit(25);

    if (jobs.length === 0) return { processed: 0, succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed = 0;

    const { sendDirectEmailProcessor } = require('./notificationService');

    for (const job of jobs) {
      const options = job.payload as unknown as EmailOptions;
      try {
        await sendDirectEmailProcessor(options);
        await job.deleteOne();
        succeeded++;
        logger.info(`[EMAIL DLQ] Retry succeeded for ${options.email} (${options.action})`);
      } catch (err: any) {
        job.attempts += 1;
        job.lastError = err.message || 'Unknown error';

        if (job.attempts >= job.maxAttempts) {
          job.status = 'exhausted';
          await job.save();
          failed++;
          await this.alertAdminExhausted(options, job.lastError || 'Unknown error');
          logger.error(`[EMAIL DLQ] Exhausted retries for ${options.email} (${options.action})`);
        } else {
          const delay = RETRY_DELAYS_MS[Math.min(job.attempts - 1, RETRY_DELAYS_MS.length - 1)];
          job.nextRetryAt = new Date(Date.now() + delay);
          await job.save();
          failed++;
          logger.warn(
            `[EMAIL DLQ] Retry ${job.attempts}/${job.maxAttempts} failed for ${options.email}: ${job.lastError}`
          );
        }
      }
    }

    return { processed: jobs.length, succeeded, failed };
  }

  private static async alertAdminExhausted(options: EmailOptions, errorMessage: string) {
    try {
      const { createAdminNotification } = require('../controllers/adminNotificationController');
      await createAdminNotification({
        title: 'Transactional email failed',
        message: `Could not deliver "${options.action}" to ${options.email} after ${3} retries. Error: ${errorMessage}`,
        type: 'system',
        actionLink: '/admin/settings',
      });
    } catch (alertErr) {
      logger.error('[EMAIL DLQ] Failed to create admin alert for exhausted email:', alertErr);
    }
  }
}
