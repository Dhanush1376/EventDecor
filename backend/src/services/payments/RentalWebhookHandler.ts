import mongoose from 'mongoose';
import RentalOrder from '../../models/RentalOrder';
import PaymentAudit from '../../models/PaymentAudit';
import OutboxEvent from '../../models/OutboxEvent';
import { RentalAvailabilityService } from '../rentals/RentalAvailabilityService';
import logger from '../../config/logger';
import * as Sentry from '@sentry/node';

/**
 * RentalWebhookHandler — Handles Razorpay webhook events for RentalOrder entities.
 *
 * PROBLEM SOLVED: If a customer's browser closes after Razorpay captures the rental payment
 * but before the frontend calls verifyRentalPayment, this webhook handler ensures the
 * rental order is still confirmed and the customer is notified.
 */
export class RentalWebhookHandler {
  static async handleWebhookEvent(
    event: string,
    body: any,
    signature: string,
    eventId: string,
    entityId: string,
  ) {
    const paymentEntity = body.payload?.payment?.entity;
    const razorpay_order_id = paymentEntity?.order_id;
    const razorpay_payment_id = paymentEntity?.id;

    if (event === 'order.paid' || event === 'payment.captured') {
      if (!razorpay_order_id || !razorpay_payment_id) {
        return { status: 200, message: 'Skipped: missing entity details for rental' };
      }

      // Idempotency check
      const existingRental = await RentalOrder.findById(entityId).lean();
      if (!existingRental) {
        return { status: 200, message: 'Skipped: Rental order not found' };
      }
      if (existingRental.paymentStatus === 'paid') {
        logger.info(`[RENTAL WEBHOOK] Rental ${entityId} already paid. Idempotent skip.`);
        return { status: 200, message: 'Rental payment already processed' };
      }
      if (existingRental.razorpayPaymentId === razorpay_payment_id) {
        logger.info(
          `[RENTAL WEBHOOK] Payment ${razorpay_payment_id} already processed for rental ${entityId}`,
        );
        return { status: 200, message: 'Payment already linked to this rental' };
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const rental = await RentalOrder.findOneAndUpdate(
          {
            _id: entityId,
            razorpayOrderId: razorpay_order_id,
            paymentStatus: { $in: ['pending', 'failed'] },
          },
          { $set: { paymentStatus: 'processing' } }, // Atomic lock
          { new: true, session },
        );

        if (!rental) {
          await session.abortTransaction();
          return { status: 200, message: 'Rental not in payable state or already processed' };
        }

        // Amount validation
        const expectedAmount = Math.round(rental.totalAmount * 100);
        const isAmountValid = paymentEntity.amount === expectedAmount;
        const isCurrencyValid = paymentEntity.currency === 'INR';
        const isValid = isAmountValid && isCurrencyValid;

        // PaymentAudit entry
        await PaymentAudit.create(
          [
            {
              orderId: rental._id,
              userId: rental.user,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              eventType: 'webhook_received',
              status: isValid ? 'success' : 'tampered',
              amountExpected: expectedAmount,
              amountReceived: Number(paymentEntity.amount),
              currencyReceived: String(paymentEntity.currency),
              signatureValid: true,
              notes: `Rental webhook. Amount: ${isAmountValid}, Currency: ${isCurrencyValid}, Event: ${event}`,
              rawPayload: JSON.stringify(paymentEntity),
            },
          ],
          { session },
        );

        if (!isValid) {
          // Delete calendar entry for failed rental
          await RentalAvailabilityService.releaseDates(rental._id.toString(), session);

          rental.paymentStatus = 'failed';
          rental.statusHistory.push({
            status: 'pending',
            note: `Webhook validation failed. Expected INR ${expectedAmount / 100}, received ${paymentEntity.currency} ${paymentEntity.amount / 100}`,
          } as any);
          await rental.save({ session });

          await OutboxEvent.create(
            [
              {
                aggregateId: rental._id.toString(),
                aggregateType: 'RentalOrder',
                eventType: 'RentalPaymentFailed',
                payload: { orderId: rental._id.toString() },
              },
            ],
            { session },
          );

          // ENTERPRISE FIX: Mark webhook as processed INSIDE the transaction
          await mongoose
            .model('PaymentWebhookEvent')
            .updateOne(
              { razorpayEventId: eventId },
              { $set: { status: 'processed', updatedAt: new Date() } },
            )
            .session(session);

          await session.commitTransaction();

          Sentry.captureMessage('Rental payment validation failed via webhook', {
            level: 'warning',
            tags: { critical: 'rental_payment_tampered' },
            extra: { rentalId: rental._id, expectedAmount, receivedAmount: paymentEntity.amount },
          });

          return { status: 200, message: 'Rental webhook processed but validation failed' };
        }

        // SUCCESS: Confirm the rental
        rental.paymentStatus = 'paid';
        rental.status = 'confirmed';
        rental.razorpayPaymentId = razorpay_payment_id;
        rental.razorpaySignature = signature;
        rental.statusHistory.push({
          status: 'confirmed',
          note: 'Payment confirmed via Razorpay webhook (browser close recovery)',
          performedBy: 'system',
        } as any);

        await rental.save({ session });

        await OutboxEvent.create(
          [
            {
              aggregateId: rental._id.toString(),
              aggregateType: 'RentalOrder',
              eventType: 'RentalCreated',
              payload: {
                orderId: rental._id.toString(),
                userId: rental.user.toString(),
                type: 'online',
              },
            },
          ],
          { session },
        );

        // ENTERPRISE FIX: Mark webhook as processed INSIDE the transaction
        await mongoose
          .model('PaymentWebhookEvent')
          .updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          )
          .session(session);

        await session.commitTransaction();
        logger.info(
          `[RENTAL WEBHOOK] Successfully confirmed rental ${rental.rentalOrderId || rental._id} via webhook`,
        );

        return { status: 200, message: 'Rental order confirmed via webhook' };
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    }

    if (event === 'payment.failed') {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const rental = await RentalOrder.findOneAndUpdate(
          {
            _id: entityId,
            razorpayOrderId: razorpay_order_id,
            paymentStatus: { $in: ['pending'] },
          },
          { $set: { paymentStatus: 'failed' } },
          { new: true, session },
        );

        if (rental) {
          // Remove calendar reservation on failure
          await RentalAvailabilityService.releaseDates(rental._id.toString(), session);

          rental.statusHistory.push({
            status: 'pending',
            note: 'Payment failed — Razorpay webhook notification',
            performedBy: 'system',
          } as any);
          await rental.save({ session });

          await OutboxEvent.create(
            [
              {
                aggregateId: rental._id.toString(),
                aggregateType: 'RentalOrder',
                eventType: 'RentalPaymentFailed',
                payload: { orderId: rental._id.toString() },
              },
            ],
            { session },
          );
        }

        // ENTERPRISE FIX: Mark webhook as processed INSIDE the transaction
        await mongoose
          .model('PaymentWebhookEvent')
          .updateOne(
            { razorpayEventId: eventId },
            { $set: { status: 'processed', updatedAt: new Date() } },
          )
          .session(session);

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    }

    return { status: 200, message: 'Rental webhook processed' };
  }
}
