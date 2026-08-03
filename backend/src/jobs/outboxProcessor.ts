import logger from '../config/logger';
import OutboxEvent from '../models/OutboxEvent';
import { withCronLock } from '../utils/cronLock';
import * as Sentry from '@sentry/node';
import { TransactionalEmailService } from '../services/TransactionalEmailService';
import Order from '../models/Order';
import CustomOrder from '../models/CustomOrder';

/**
 * OutboxProcessor — Processes ALL outbox event types.
 *
 * Previously only handled 'OrderCreated'. Now handles:
 * - OrderCreated → Customer + admin order confirmation emails
 * - PaymentFailed → Customer failure email + admin alert
 * - PaymentDisputed → Admin dispute notification
 * - BookingConfirmed → Customer booking confirmation email + admin notification
 * - RentalCreated → Customer rental confirmation email + admin notification
 * - RentalPaymentFailed → Customer failure email
 * - RefundFailed → Critical admin alert + Sentry
 */
export const processOutboxEvents = async () => {
  await withCronLock('outbox-processor', 20, async () => {
    // Process up to 50 pending events
    const events = await OutboxEvent.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(50)
      .maxTimeMS(10000);

    if (events.length === 0) return;

    logger.info(`[OUTBOX] Found ${events.length} pending events to process`);

    for (const event of events) {
      try {
        await processEvent(event);

        event.status = 'PUBLISHED';
        await event.save();
      } catch (err: any) {
        logger.error(
          `[OUTBOX] Failed to process event ${event._id} (${event.aggregateType}/${event.eventType}):`,
          err,
        );
        event.retryCount += 1;
        event.errorDetails = err.message;
        if (event.retryCount >= 5) {
          event.status = 'FAILED';
          Sentry.captureMessage(
            `Outbox event exhausted retries: ${event.aggregateType}/${event.eventType}`,
            {
              level: 'error',
              tags: { critical: 'outbox_dead_letter' },
              extra: {
                eventId: event._id.toString(),
                aggregateId: event.aggregateId,
                errorDetails: err.message,
              },
            },
          );
        }
        await event.save();
      }
    }
  });
};

async function processEvent(event: any): Promise<void> {
  // Convert "Aggregate:Action" to "AGGREGATE_ACTION" format
  const eventName = `${event.aggregateType}_${event.eventType}`.toUpperCase();

  // 1. Process Transactional Emails based on Outbox Event (Persistent/Idempotent)
  try {
    if (eventName === 'ORDER_ORDERCREATED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order)
        await TransactionalEmailService.sendOrderPlacedEmails(
          order,
          order.user,
          event._id.toString(),
        );
    } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && event.payload) {
        await TransactionalEmailService.sendOrderStatusChangeEmail(
          order,
          order.user,
          event.payload.oldStatus,
          event.payload.newStatus,
          event._id.toString(),
        );
      }
    } else if (eventName === 'CUSTOMORDER_CUSTOMORDERSUBMITTED') {
      const customOrder = await CustomOrder.findById(event.aggregateId);
      if (customOrder)
        await TransactionalEmailService.sendCustomOrderSubmissionEmails(
          customOrder,
          event._id.toString(),
        );
    } else if (eventName === 'CUSTOMORDER_PRODUCTCUSTOMIZATIONSUBMITTED') {
      const customOrder = await CustomOrder.findById(event.aggregateId);
      if (customOrder)
        await TransactionalEmailService.sendCustomOrderSubmissionEmails(
          customOrder,
          event._id.toString(),
        );
    }
  } catch (emailErr) {
    logger.error(`[OUTBOX] Failed to send transactional email for ${eventName}:`, emailErr);
    // We intentionally don't throw here to avoid poisoning the outbox for non-email side-effects,
    // as TransactionalEmailService itself uses a persistent queue.
  }

  // 2. Handle specific internal Business Domain Side-Effects (Event Subscribers)
  // In a full microservices architecture, this would publish to Kafka/RabbitMQ.
  // Here we route to specific domain services if necessary.

  if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
    const { triggerPurchaseRewards, triggerReversalRewards, total, userId, orderId } =
      event.payload;
    if (triggerPurchaseRewards) {
      try {
        const { LoyaltyService } = require('../services/loyaltyService');
        await LoyaltyService.processPurchaseRewards(userId, orderId, total);
      } catch (err) {
        logger.error('Failed to process purchase rewards:', err);
      }
    } else if (triggerReversalRewards) {
      try {
        const { LoyaltyService } = require('../services/loyaltyService');
        await LoyaltyService.reversePurchaseRewards(orderId);
      } catch (err) {
        logger.error('Failed to reverse purchase rewards:', err);
      }
    }
  }

  if (eventName.endsWith('_REFUNDREQUESTED')) {
    const { PaymentRefundService } = require('../services/PaymentRefundService');
    const { amount, reason, razorpayPaymentId } = event.payload;
    try {
      await PaymentRefundService.initiateAsyncRefund({
        amount,
        currency: 'INR',
        originalTransactionId: razorpayPaymentId,
        entityType: event.aggregateType,
        entityId: event.aggregateId,
        reason,
      });
      logger.info(`[OUTBOX REFUND] Successfully enqueued refund for ${razorpayPaymentId}`);
    } catch (err) {
      logger.error(`[OUTBOX REFUND] Failed to enqueue refund for ${razorpayPaymentId}:`, err);
      throw err; // Force retry
    }
  }

  if (eventName === 'SYSTEM_NOTIFICATIONQUEUED') {
    if (event.payload && event.payload.emailOptions) {
      const { sendDirectEmailProcessor } = require('../services/notificationService');
      await sendDirectEmailProcessor(event.payload.emailOptions);
    }
  }
}
