import mongoose from 'mongoose';
import Order from '../models/Order';
import logger from '../config/logger';
import PaymentAudit from '../models/PaymentAudit';
import { PaymentStateMachine } from './payments/PaymentStateMachine';
import PaymentAttempt from '../models/PaymentAttempt';
import PaymentWebhookEvent from '../models/PaymentWebhookEvent';
import OutboxEvent from '../models/OutboxEvent';
import { webhookQueue } from '../jobs/queues';
import { bumpAdminAnalyticsCacheVersion } from '../utils/cache/cacheVersion';
import AnalyticsService from './analyticsService';
import crypto from 'crypto';
import { UnifiedWebhookRouter } from './payments/UnifiedWebhookRouter';

export class PaymentWebhookService {
  /**
   * INGESTION: Accepts the webhook and appends it to DB/Queue. Idempotent and FAST.
   */
  static verifyWebhookSignature(
    signature: string,
    rawBody: Buffer,
    webhookSecret: string,
  ): boolean {
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');
    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(signature || '', 'utf8');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }
  static async processRazorpayWebhook(
    event: string,
    body: any,
    signature: string,
    eventId: string,
  ) {
    logger.info(
      `[PAYMENT WEBHOOK] Received verified Razorpay event: ${event} [EventID: ${eventId}]`,
    );

    try {
      await PaymentWebhookEvent.create({
        razorpayEventId: eventId,
        eventType: event,
        payload: body.payload || body,
        status: 'pending',
      });

      if (webhookQueue) {
        await webhookQueue.add('processWebhook', { event, body, signature, eventId });
        return { status: 200, message: 'Webhook queued successfully' };
      } else {
        logger.warn(
          '[PAYMENT WEBHOOK] BullMQ webhookQueue is not available. Processing synchronously.',
        );
        // Use UnifiedWebhookRouter for synchronous fallback to handle all entity types
        return await UnifiedWebhookRouter.routeWebhookEvent(event, body, signature, eventId);
      }
    } catch (err: any) {
      if (err.code === 11000) {
        logger.info(
          `[PAYMENT WEBHOOK] Duplicate event received from Razorpay [EventID: ${eventId}]`,
        );
        return { status: 200, message: 'Duplicate event skipped' };
      }
      logger.error(`[PAYMENT WEBHOOK ERROR] Failed to save/queue event ${eventId}:`, err);
      throw err;
    }
  }

  /**
   * PROCESSING: The worker function that actually processes the webhook.
   */
  static async processRazorpayWebhookCore(
    event: string,
    body: any,
    signature: string,
    eventId: string,
  ) {
    logger.info(`[PAYMENT WEBHOOK CORE] Processing Razorpay event: ${event}`);

    if (eventId) {
      // Absolute cap: prevent infinite retry loops on permanently corrupt events
      const existingEvent = await PaymentWebhookEvent.findOne({ razorpayEventId: eventId });
      if (existingEvent && existingEvent.processingAttempts >= 10) {
        logger.error(
          `[PAYMENT WEBHOOK] Event ${eventId} exceeded max processing attempts (10). Marking as dead_letter.`,
        );
        await PaymentWebhookEvent.updateOne(
          { razorpayEventId: eventId },
          { $set: { status: 'dead_letter', updatedAt: new Date() } },
        );
        return { status: 200, message: 'Event exceeded max retry attempts — dead-lettered' };
      }

      const claimedEvent = await PaymentWebhookEvent.findOneAndUpdate(
        { razorpayEventId: eventId, status: { $in: ['pending', 'failed'] } },
        {
          $set: { status: 'processing', lastAttemptAt: new Date() },
          $inc: { processingAttempts: 1 },
        },
        { returnDocument: 'after' },
      );

      if (!claimedEvent) {
        const existing = await PaymentWebhookEvent.findOne({ razorpayEventId: eventId });
        if (existing && existing.status === 'processed') {
          logger.info(`[PAYMENT WEBHOOK IDEMPOTENCY] Event ${eventId} already processed`);
          return { status: 200, message: 'Webhook already processed' };
        }
        if (existing && existing.status === 'processing') {
          logger.info(`[PAYMENT WEBHOOK IDEMPOTENCY] Event ${eventId} is currently processing`);
          return { status: 200, message: 'Webhook currently being processed' };
        }
      }
    }

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      const razorpay_payment_id = paymentEntity?.id;

      if (!razorpay_order_id || !razorpay_payment_id) {
        return { status: 200, message: 'Skipped: missing entity details' };
      }

      const paymentData = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: signature || 'webhook_bypass',
      };

      try {
        const { PaymentVerificationService } = require('./PaymentVerificationService');
        await PaymentVerificationService.verifyPayment(paymentData, 'system', 'admin', 'webhook');

        await PaymentWebhookEvent.updateOne(
          { razorpayEventId: eventId },
          { $set: { status: 'processed', updatedAt: new Date() } },
        );

        AnalyticsService.clearCache();
        await bumpAdminAnalyticsCacheVersion();

        return { status: 200, message: 'Payment successfully captured via Webhook' };
      } catch (err: any) {
        if (err.statusCode === 409 || err.statusCode === 400) {
          // If 409: Currently being processed by frontend callback
          // If 400: Tampered/Invalid signature (already handled/logged by verifyPayment)
          await PaymentWebhookEvent.updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          );
          return { status: 200, message: err.message };
        }
        throw err;
      }
    }

    if (event === 'payment.failed') {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      if (razorpay_order_id) {
        // Use a transaction for atomic webhook status update â€” prevents re-processing
        // if the process crashes between business logic and status mark.
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          // Log the failure in the audit trail
          if (paymentEntity?.id) {
            await PaymentAudit.create(
              [
                {
                  razorpayOrderId: razorpay_order_id,
                  razorpayPaymentId: paymentEntity.id,
                  eventType: 'webhook_received',
                  status: 'failed',
                  amountReceived: Number(paymentEntity.amount || 0),
                  currencyReceived: String(paymentEntity.currency || 'INR'),
                  signatureValid: true,
                  notes: `Payment failed webhook. Error: ${paymentEntity.error_description || paymentEntity.error_code || 'Unknown'}`,
                },
              ],
              { session },
            );
          }

          // Mark webhook as processed inside the transaction
          await PaymentWebhookEvent.updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          ).session(session);

          // eslint-disable-next-line unused-imports/no-unused-vars
          const attempt = await PaymentAttempt.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id, status: 'initiated' },
            { $set: { status: 'failed' } },
            { session, returnDocument: 'after' },
          );

          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
        return {
          status: 200,
          message: 'Payment failed webhook processed. Order marked as failed.',
        };
      }
    }

    if (
      event === 'payment.dispute.created' ||
      event === 'payment.dispute.won' ||
      event === 'payment.dispute.lost'
    ) {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_payment_id = paymentEntity?.id;
      if (razorpay_payment_id) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const order = await Order.findOne({ razorpayPaymentId: razorpay_payment_id }).session(
            session,
          );
          if (order) {
            const disputeState =
              event === 'payment.dispute.created'
                ? 'dispute_open'
                : event === 'payment.dispute.won'
                  ? 'dispute_won'
                  : 'dispute_lost';

            if (
              PaymentStateMachine.canTransition(order.paymentStatus as any, disputeState as any)
            ) {
              PaymentStateMachine.transition(
                order,
                disputeState as any,
                `Razorpay dispute update: ${event}`,
              );
              await order.save({ session });

              await OutboxEvent.create(
                [
                  {
                    aggregateId: order._id.toString(),
                    aggregateType: 'Order',
                    eventType: 'PaymentDisputed',
                    payload: { orderId: order._id.toString(), disputeState },
                  },
                ],
                { session },
              );
            }
          }

          // ENTERPRISE FIX: Mark webhook as processed INSIDE the transaction
          await PaymentWebhookEvent.updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          ).session(session);

          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      }
    }

    if (event === 'refund.processed' || event === 'refund.failed') {
      const refundEntity = body.payload?.refund?.entity;
      const razorpay_payment_id = refundEntity?.payment_id;
      if (razorpay_payment_id) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const order = await Order.findOne({ razorpayPaymentId: razorpay_payment_id }).session(
            session,
          );
          if (order) {
            await PaymentAudit.create(
              [
                {
                  orderId: order._id,
                  userId: order.user,
                  razorpayOrderId: order.razorpayOrderId,
                  razorpayPaymentId: razorpay_payment_id,
                  eventType: 'webhook_received',
                  status: event === 'refund.processed' ? 'success' : 'failed',
                  notes: `Refund ${event}: ${refundEntity?.id}`,
                  rawPayload: JSON.stringify(refundEntity),
                },
              ],
              { session },
            );

            if (event === 'refund.processed') {
              if (PaymentStateMachine.canTransition(order.paymentStatus as any, 'refunded')) {
                PaymentStateMachine.transition(order, 'refunded', `Razorpay webhook: ${event}`);
                await order.save({ session });
              }
            }
          }

          await PaymentWebhookEvent.updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          ).session(session);

          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      }
      return { status: 200, message: `Webhook processed: ${event}` };
    }

    if (event === 'order.expired') {
      const orderEntity = body.payload?.order?.entity;
      if (orderEntity?.id) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          await PaymentWebhookEvent.updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          ).session(session);
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      }
      return { status: 200, message: `Webhook processed: ${event}` };
    }

    return { status: 200, message: 'Webhook event received and processed' };
  }
}

// Wire up circular dependency (UnifiedWebhookRouter -> PaymentWebhookService -> UnifiedWebhookRouter)
import { setOrderWebhookHandler } from './payments/UnifiedWebhookRouter';
setOrderWebhookHandler(
  PaymentWebhookService.processRazorpayWebhookCore.bind(PaymentWebhookService),
);
