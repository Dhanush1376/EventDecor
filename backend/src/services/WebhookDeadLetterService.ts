import PaymentWebhookEvent from '../models/PaymentWebhookEvent';
import { UnifiedWebhookRouter } from './payments/UnifiedWebhookRouter';
import logger from '../config/logger';
import * as Sentry from '@sentry/node';
import { createAdminNotification } from './notificationService';
import { AlertingService } from './AlertingService';

/**
 * WebhookDeadLetterService â€” Recovers failed or stuck webhook events.
 *
 * Finds PaymentWebhookEvent records stuck in 'pending' or 'failed' state
 * and replays them through UnifiedWebhookRouter.
 *
 * After MAX_RETRIES failed attempts, marks as 'dead_letter' and alerts admins.
 */
export class WebhookDeadLetterService {
  private static readonly MAX_RETRIES = 5;
  private static readonly STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Finds and replays stuck/failed webhook events.
   * Called by CRON job every 5 minutes.
   */
  static async processDeadLetters(): Promise<{
    processed: number;
    recovered: number;
    deadLettered: number;
  }> {
    const stuckThreshold = new Date(Date.now() - this.STUCK_THRESHOLD_MS);

    // Find events that are stuck in pending (never picked up) or failed (processing crashed)
    const stuckEvents = await PaymentWebhookEvent.find({
      $or: [
        { status: 'pending', createdAt: { $lt: stuckThreshold } },
        { status: 'failed', processingAttempts: { $lt: this.MAX_RETRIES } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(20); // Process in batches of 20

    let processed = 0;
    let recovered = 0;
    let deadLettered = 0;

    for (const event of stuckEvents) {
      processed++;

      // Check if already exhausted retries
      if (event.processingAttempts >= this.MAX_RETRIES) {
        await this.markAsDeadLetter(event);
        deadLettered++;
        continue;
      }

      try {
        // Atomically claim the event for processing (prevent double processing)
        const claimed = await PaymentWebhookEvent.findOneAndUpdate(
          { _id: event._id, status: { $in: ['pending', 'failed'] } },
          {
            $set: { status: 'processing', lastAttemptAt: new Date() },
            $inc: { processingAttempts: 1 },
          },
          { returnDocument: 'after' },
        );

        if (!claimed) {
          // Another worker already claimed it
          continue;
        }

        logger.info(
          `[DEAD LETTER] Replaying webhook event ${event.razorpayEventId} (attempt ${claimed.processingAttempts}/${this.MAX_RETRIES})`,
        );

        // Replay through the unified webhook router
        await UnifiedWebhookRouter.routeWebhookEvent(
          event.eventType,
          event.payload,
          '', // Signature already verified on first ingestion
          event.razorpayEventId,
        );

        // Mark as processed
        await PaymentWebhookEvent.findByIdAndUpdate(event._id, {
          $set: { status: 'processed' },
        });

        recovered++;
        logger.info(`[DEAD LETTER] Successfully recovered webhook event ${event.razorpayEventId}`);
      } catch (err: any) {
        logger.error(
          `[DEAD LETTER] Failed to replay webhook event ${event.razorpayEventId}: ${err.message}`,
        );

        // Mark as failed with error details
        await PaymentWebhookEvent.findByIdAndUpdate(event._id, {
          $set: {
            status: 'failed',
            errorLog: `Attempt ${event.processingAttempts + 1}: ${err.message}`,
          },
        });

        // If this was the last retry, dead-letter it
        if (event.processingAttempts + 1 >= this.MAX_RETRIES) {
          await this.markAsDeadLetter(event);
          deadLettered++;
        }
      }
    }

    if (processed > 0) {
      logger.info(
        `[DEAD LETTER] Processed ${processed} events: ${recovered} recovered, ${deadLettered} dead-lettered`,
      );
    }

    return { processed, recovered, deadLettered };
  }

  /**
   * Marks an event as dead-lettered and alerts admins.
   */
  private static async markAsDeadLetter(event: any): Promise<void> {
    await PaymentWebhookEvent.findByIdAndUpdate(event._id, {
      $set: { status: 'dead_letter' },
    });

    logger.error(
      `[DEAD LETTER] Webhook event ${event.razorpayEventId} (${event.eventType}) moved to dead letter after ${event.processingAttempts} attempts`,
    );

    Sentry.captureMessage(`Webhook event dead-lettered: ${event.razorpayEventId}`, {
      level: 'error',
      tags: { critical: 'webhook_dead_letter' },
      extra: {
        eventId: event.razorpayEventId,
        eventType: event.eventType,
        attempts: event.processingAttempts,
        errorLog: event.errorLog,
      },
    });

    // Admin notification
    await createAdminNotification({
      title: '⚠️ Webhook Dead Letter',
      message: `Payment webhook ${event.razorpayEventId} (${event.eventType}) failed after ${event.processingAttempts} attempts and has been moved to dead letter. Manual investigation required.`,
      type: 'payment',
      actionLink: `/admin/payments/webhooks?status=dead_letter`,
    }).catch((e: any) => logger.error('Failed to create dead letter admin notification:', e));

    // Multi-channel alerting (email, Sentry, webhook)
    await AlertingService.paymentFailure('Webhook Dead-Lettered', {
      eventId: event.razorpayEventId,
      eventType: event.eventType,
      attempts: event.processingAttempts,
      error: event.errorLog || 'Max retries exhausted',
    }).catch((e: any) => logger.error('AlertingService failed for dead letter:', e));
  }

  /**
   * Get dead-lettered events for admin review.
   */
  static async getDeadLetterQueue(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      PaymentWebhookEvent.find({ status: 'dead_letter' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentWebhookEvent.countDocuments({ status: 'dead_letter' }),
    ]);
    return { events, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Manually retry a dead-lettered event (admin action).
   */
  static async retryDeadLetter(eventId: string): Promise<boolean> {
    const event = await PaymentWebhookEvent.findByIdAndUpdate(
      eventId,
      {
        $set: { status: 'pending', processingAttempts: 0, errorLog: 'Manually retried by admin' },
      },
      { returnDocument: 'after' },
    );

    if (!event) return false;

    logger.info(`[DEAD LETTER] Event ${event.razorpayEventId} manually requeued by admin`);
    return true;
  }
}
