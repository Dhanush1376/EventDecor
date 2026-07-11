import Order from '../../models/Order';
import EventJob from '../../domains/event_operations/models/EventJob';
import RentalOrder from '../../models/RentalOrder';
import logger from '../../config/logger';
import { EventJobWebhookHandler } from './EventJobWebhookHandler';
import { RentalWebhookHandler } from './RentalWebhookHandler';

import PaymentWebhookEvent from '../../models/PaymentWebhookEvent';

export let processOrderWebhookHandler: (
  event: string,
  body: any,
  signature: string,
  eventId: string,
) => Promise<any>;
export const setOrderWebhookHandler = (handler: typeof processOrderWebhookHandler) => {
  processOrderWebhookHandler = handler;
};

/**
 * UnifiedWebhookRouter â€” Routes Razorpay webhook events to the correct entity handler.
 *
 * PROBLEM SOLVED: Previously, PaymentWebhookService only handled Order entities.
 * EventJob and RentalOrder payments that arrived via webhook (browser close,
 * delayed capture, etc.) were silently ignored, causing revenue loss.
 *
 * FLOW:
 * 1. Extract razorpay_order_id from webhook payload
 * 2. Look up which collection owns that razorpay_order_id
 * 3. Route to the correct handler: Order, EventJob, or RentalOrder
 */
export class UnifiedWebhookRouter {
  /**
   * Identifies the entity type that owns a given razorpay_order_id.
   * Uses indexed lookups on all three collections.
   */
  static async identifyEntity(razorpayOrderId: string): Promise<{
    entityType: 'Order' | 'EventJob' | 'RentalOrder' | 'PaymentAttempt' | null;
    entityId: string | null;
  }> {
    // Check PaymentAttempt first (for new uncreated orders)
    const PaymentAttempt = require('../../models/PaymentAttempt').default;
    const attempt = await PaymentAttempt.findOne({ razorpayOrderId }).select('_id').lean();
    if (attempt) {
      return { entityType: 'PaymentAttempt', entityId: attempt._id.toString() };
    }
    // Check Order first (most common)
    const order = await Order.findOne({ razorpayOrderId }).select('_id').lean();
    if (order) {
      return { entityType: 'Order', entityId: order._id.toString() };
    }

    // Check EventJob
    const booking = await EventJob.findOne({ razorpayOrderId }).select('_id').lean();
    if (booking) {
      return { entityType: 'EventJob', entityId: booking._id.toString() };
    }

    // Check RentalOrder
    const rental = await RentalOrder.findOne({ razorpayOrderId }).select('_id').lean();
    if (rental) {
      return { entityType: 'RentalOrder', entityId: rental._id.toString() };
    }

    return { entityType: null, entityId: null };
  }

  /**
   * Main entry point for webhook processing after ingestion.
   * Called by the webhook worker (BullMQ) or synchronously as fallback.
   */
  static async routeWebhookEvent(event: string, body: any, signature: string, eventId: string) {
    // Extract the razorpay_order_id from the webhook payload
    const paymentEntity = body.payload?.payment?.entity;
    const orderEntity = body.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

    // 1. Acquire Idempotency Lock
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const claimedEvent = await PaymentWebhookEvent.findOneAndUpdate(
      {
        razorpayEventId: eventId,
        $or: [
          { status: { $in: ['pending', 'failed'] } },
          { status: 'processing', lastAttemptAt: { $lt: fiveMinutesAgo } },
        ],
      },
      {
        $set: { status: 'processing', lastAttemptAt: new Date() },
        $inc: { processingAttempts: 1 },
      },
      { returnDocument: 'after' },
    );

    if (!claimedEvent) {
      const existing = await PaymentWebhookEvent.findOne({ razorpayEventId: eventId });
      if (existing?.status === 'processed') {
        logger.info(`[UNIFIED WEBHOOK] Event ${eventId} already processed, skipping.`);
        return { status: 200, message: 'Event already processed' };
      }
      logger.info(
        `[UNIFIED WEBHOOK] Event ${eventId} is currently processing by another worker. Skipping.`,
      );
      return { status: 200, message: 'Event is currently processing' };
    }

    try {
      if (event === 'refund.processed' || event === 'refund.failed') {
        const { PaymentRefundService } = require('./../PaymentRefundService');
        return await PaymentRefundService.processRefundWebhook(event, body, signature, eventId);
      }

      if (!razorpayOrderId) {
        // Dispute events and other non-payment events still route to the order handler
        return await processOrderWebhookHandler(event, body, signature, eventId);
      }

      // Identify which entity this payment belongs to
      const { entityType, entityId } = await this.identifyEntity(razorpayOrderId);

      if (!entityType) {
        logger.warn(
          `[UNIFIED WEBHOOK] No entity found for razorpayOrderId: ${razorpayOrderId} (Event: ${event})`,
        );
        return {
          status: 200,
          message: 'Skipped: No matching entity found for this razorpay order',
        };
      }

      logger.info(
        `[UNIFIED WEBHOOK] Routing ${event} to ${entityType} handler (Entity: ${entityId}, RzpOrderId: ${razorpayOrderId})`,
      );

      let result;
      switch (entityType) {
        case 'PaymentAttempt':
        case 'Order':
          result = await processOrderWebhookHandler(event, body, signature, eventId);
          break;
        case 'EventJob':
          result = await EventJobWebhookHandler.handleWebhookEvent(
            event,
            body,
            signature,
            eventId,
            entityId!,
          );
          break;
        case 'RentalOrder':
          result = await RentalWebhookHandler.handleWebhookEvent(
            event,
            body,
            signature,
            eventId,
            entityId!,
          );
          break;
        default:
          logger.error(`[UNIFIED WEBHOOK] Unknown entity type: ${entityType}`);
          result = { status: 200, message: 'Unknown entity type' };
      }

      return result;
    } catch (err: any) {
      logger.error(`[UNIFIED WEBHOOK] Error processing event ${eventId}:`, err);
      // Release lock on failure
      await PaymentWebhookEvent.updateOne(
        { razorpayEventId: eventId },
        { $set: { status: 'failed', errorLog: err.message, updatedAt: new Date() } },
      );
      throw err;
    }
  }
}
