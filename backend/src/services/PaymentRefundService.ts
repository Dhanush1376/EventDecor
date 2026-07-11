import mongoose from 'mongoose';
import RefundRecord from '../models/RefundRecord';
import logger from '../config/logger';
import { RazorpayGateway } from '../utils/payment/RazorpayGateway';
import ApiError from '../utils/ApiError';
import { refundQueue } from '../jobs/queues';
import OutboxEvent from '../models/OutboxEvent';
import { AlertingService } from './AlertingService';

export class PaymentRefundService {
  /**
   * Initiates an asynchronous refund by creating a RefundRecord and enqueueing it.
   */
  static async initiateAsyncRefund(
    {
      amount,
      currency = 'INR',
      originalTransactionId,
      entityType,
      entityId,
      isPartial = false,
      reason,
    }: {
      amount: number;
      currency?: string;
      originalTransactionId: string;
      entityType: 'Order' | 'Rental' | 'EventJob';
      entityId: mongoose.Types.ObjectId | string;
      isPartial?: boolean;
      reason?: string;
    },
    session?: mongoose.ClientSession,
  ): Promise<void> {
    const refundOptions: any = {
      amount,
      currency,
      originalTransactionId,
      entityType,
      entityId,
      status: 'pending',
      isPartial,
    };
    if (reason) refundOptions.reason = reason;

    const [refundRecord] = await RefundRecord.create([refundOptions], { session });

    const { isQueuesReady } = require('../jobs/queues');
    if (isQueuesReady()) {
      await refundQueue.add('processRefund', { refundRecordId: refundRecord._id });
      logger.info(`[REFUND] Enqueued async refund job for RefundRecord ${refundRecord._id}`);
    } else {
      logger.error(`[CRITICAL] BullMQ not ready. Cannot enqueue refund ${refundRecord._id}`);
      throw new ApiError(500, 'Queue system unavailable. Cannot initiate refund safely.');
    }
  }

  /**
   * Core execution for the refund, called by the BullMQ worker.
   */
  static async processRefundAsyncCore(refundRecordId: string): Promise<void> {
    const refundRecord = await RefundRecord.findOneAndUpdate(
      { _id: refundRecordId, status: { $in: ['pending', 'failed'] } },
      { $set: { status: 'processing' }, $inc: { retryCount: 1 } },
      { returnDocument: 'after' },
    );

    if (!refundRecord) {
      const existing = await RefundRecord.findById(refundRecordId);
      if (!existing) throw new Error(`RefundRecord ${refundRecordId} not found`);

      if (existing.status === 'completed') {
        logger.warn(`[REFUND] Skipping already finalized refund ${refundRecordId}`);
        return;
      }
      if (existing.status === 'processing') {
        logger.warn(`[REFUND] Skipping refund ${refundRecordId} as it is currently processing`);
        return;
      }

      const maxRetries = 3;
      if (existing.status === 'failed' && existing.retryCount >= maxRetries) {
        logger.warn(`[REFUND] Skipping failed refund ${refundRecordId} - max retries reached`);
        return;
      }

      throw new Error(`RefundRecord ${refundRecordId} in unexpected state: ${existing.status}`);
    }

    if (refundRecord.razorpayRefundId) {
      logger.info(`[REFUND] RefundRecord ${refundRecordId} already has Razorpay ID, skipping`);
      await RefundRecord.updateOne({ _id: refundRecordId }, { $set: { status: 'completed' } });
      return;
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay gateway not configured');
    }

    try {
      // Polling check: See if Razorpay already processed this exact refund
      const existingRefunds = await RazorpayGateway.getPaymentRefunds(
        refundRecord.originalTransactionId,
      );
      const matchedRefund = existingRefunds.items?.find(
        (r: any) => r.notes?.refundRecordId === refundRecord._id.toString(),
      );

      let rzpRefund;
      if (matchedRefund) {
        logger.info(
          `[REFUND] Found existing Razorpay refund ${matchedRefund.id} for RefundRecord ${refundRecord._id}`,
        );
        rzpRefund = matchedRefund;
      } else {
        rzpRefund = await RazorpayGateway.initiateRefund(refundRecord.originalTransactionId, {
          amount: Math.round(refundRecord.amount * 100), // strictly in paise
          notes: {
            entityType: refundRecord.entityType,
            entityId: refundRecord.entityId.toString(),
            refundRecordId: refundRecord._id.toString(),
          },
        });
      }

      await RefundRecord.updateOne(
        { _id: refundRecord._id },
        { $set: { status: 'completed', razorpayRefundId: rzpRefund.id } },
      );
      logger.info(`[REFUND] Successfully processed refund ${refundRecord._id} via Razorpay`);

      // Update Order payment status if applicable
      if (refundRecord.entityType === 'Order') {
        const Order = require('../models/Order').default;
        const newStatus = refundRecord.isPartial ? 'partially_refunded' : 'refunded';
        await Order.findByIdAndUpdate(refundRecord.entityId, { paymentStatus: newStatus });
      }

      // Emit refund socket event
      const { emitAdminNotification, emitUserEvent } = require('../socket');
      const payload = {
        refundId: refundRecord._id,
        status: 'completed',
        amount: refundRecord.amount,
      };
      if (refundRecord.entityType === 'Order') {
        const Order = require('../models/Order').default;
        const order = await Order.findById(refundRecord.entityId);
        if (order) emitUserEvent(order.user.toString(), 'refund:status_updated', payload);
      }
      emitAdminNotification({
        type: 'refund_status',
        title: 'Refund Completed',
        message: `Refund for ${refundRecord.entityType} completed`,
        data: payload,
      });
    } catch (err: any) {
      logger.error(`[REFUND] Error processing refund ${refundRecord._id}:`, err);

      const maxRetries = 3;
      if (refundRecord.retryCount >= maxRetries) {
        await RefundRecord.updateOne(
          { _id: refundRecord._id },
          { $set: { status: 'failed', errorDetails: err.message || 'Unknown Razorpay Error' } },
        );

        await OutboxEvent.create([
          {
            aggregateId: refundRecord._id.toString(),
            aggregateType: 'Refund',
            eventType: 'RefundFailed',
            payload: { refundRecordId: refundRecord._id.toString(), error: err.message },
          },
        ]);

        // Alert payment team about permanently failed refund
        await AlertingService.paymentFailure('Refund Exhausted All Retries', {
          refundRecordId: refundRecord._id.toString(),
          amount: refundRecord.amount,
          entityType: refundRecord.entityType,
          entityId: refundRecord.entityId?.toString(),
          error: err.message,
          retryCount: refundRecord.retryCount,
        }).catch((e: any) => logger.error('AlertingService failed for refund:', e));
      } else {
        await RefundRecord.updateOne(
          { _id: refundRecord._id },
          { $set: { status: 'pending', errorDetails: err.message } },
        );
        throw err; // Trigger BullMQ retry backoff
      }
    }
  }

  /**
   * Retrieves refund status for customer-facing APIs.
   */
  static async getRefundStatusForEntity(entityType: string, entityId: string) {
    return await RefundRecord.find({ entityType, entityId })
      .select('amount status isPartial reason createdAt razorpayRefundId errorDetails')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Auto-process stuck pending refunds (called by CRON)
   */
  static async processPendingRefunds(): Promise<number> {
    const stuckThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    const stuckRefunds = await RefundRecord.find({
      status: { $in: ['pending', 'processing'] },
      createdAt: { $lt: stuckThreshold },
      retryCount: { $lt: 3 },
    });

    let processed = 0;
    const { isQueuesReady } = require('../jobs/queues');
    if (isQueuesReady()) {
      for (const refund of stuckRefunds) {
        await refundQueue.add('processRefund', { refundRecordId: refund._id });
        logger.info(`[REFUND] Requeued stuck refund ${refund._id}`);
        processed++;
      }
    }
    return processed;
  }

  /**
   * Process refund webhooks from Razorpay (refund.processed, refund.failed)
   */
  static async processRefundWebhook(event: string, body: any, signature: string, eventId: string) {
    const refundEntity = body.payload?.refund?.entity;
    if (!refundEntity) {
      logger.warn(`[REFUND WEBHOOK] Missing refund entity in payload for event ${eventId}`);
      return { status: 200, message: 'Skipped: Missing refund entity' };
    }

    const razorpayRefundId = refundEntity.id;
    const refundRecordId = refundEntity.notes?.refundRecordId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let refundRecord;
      if (refundRecordId) {
        refundRecord = await RefundRecord.findById(refundRecordId).session(session);
      } else {
        refundRecord = await RefundRecord.findOne({ razorpayRefundId }).session(session);
      }

      if (!refundRecord) {
        // If we don't have a RefundRecord yet, it might be an admin dashboard refund directly on Razorpay
        // We could create a record, but for now we'll just log and acknowledge
        logger.info(
          `[REFUND WEBHOOK] No internal RefundRecord found for RZP Refund ${razorpayRefundId}`,
        );
        await session.abortTransaction();
        return { status: 200, message: 'Processed: No internal record' };
      }

      if (event === 'refund.processed') {
        refundRecord.status = 'completed';
        refundRecord.razorpayRefundId = razorpayRefundId;
        await refundRecord.save({ session });
        logger.info(`[REFUND WEBHOOK] Refund ${refundRecord._id} marked as completed`);

        if (refundRecord.entityType === 'Order') {
          const Order = require('../models/Order').default;
          const newStatus = refundRecord.isPartial ? 'partially_refunded' : 'refunded';
          await Order.findByIdAndUpdate(
            refundRecord.entityId,
            { paymentStatus: newStatus },
            { session },
          );
          const order = await Order.findById(refundRecord.entityId).session(session);
          const { emitAdminNotification, emitUserEvent } = require('../socket');
          const payload = {
            refundId: refundRecord._id,
            status: 'completed',
            amount: refundRecord.amount,
          };
          if (order) emitUserEvent(order.user.toString(), 'refund:status_updated', payload);
          emitAdminNotification({
            type: 'refund_status',
            title: 'Refund Completed',
            message: `Refund for ${refundRecord.entityType} completed via webhook`,
            data: payload,
          });
        }
      } else if (event === 'refund.failed') {
        refundRecord.status = 'failed';
        refundRecord.errorDetails = 'Failed via Razorpay webhook';
        await refundRecord.save({ session });

        await OutboxEvent.create(
          [
            {
              aggregateId: refundRecord._id.toString(),
              aggregateType: 'Refund',
              eventType: 'RefundFailed',
              payload: {
                refundRecordId: refundRecord._id.toString(),
                error: 'Razorpay webhook reported failure',
              },
            },
          ],
          { session },
        );
        logger.info(`[REFUND WEBHOOK] Refund ${refundRecord._id} marked as failed`);
      }

      // Mark webhook event as processed
      const PaymentWebhookEvent = require('../models/PaymentWebhookEvent').default;
      await PaymentWebhookEvent.updateOne(
        { razorpayEventId: eventId },
        { $set: { status: 'processed', updatedAt: new Date() } },
      ).session(session);

      await session.commitTransaction();
      return { status: 200, message: `Refund webhook ${event} processed successfully` };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
