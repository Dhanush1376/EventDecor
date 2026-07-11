import mongoose from 'mongoose';
import EventJob from '../../domains/event_operations/models/EventJob';
import PaymentAudit from '../../models/PaymentAudit';
import OutboxEvent from '../../models/OutboxEvent';
import BookingMessage from '../../models/BookingMessage';
import { EventJobStateMachine } from '../eventBooking/EventJobStateMachine';
import { PaymentRefundService } from '../PaymentRefundService';
import logger from '../../config/logger';
import * as Sentry from '@sentry/node';

/**
 * EventJobWebhookHandler â€” Handles Razorpay webhook events for EventJob entities.
 *
 * PROBLEM SOLVED: If a customer's browser closes after Razorpay captures the deposit payment
 * but before the frontend calls verifyBookingCheckout, this webhook handler ensures the
 * booking is still confirmed and the customer is notified.
 *
 * This mirrors the logic in EventJobCheckoutService.verifyBookingCheckout() but is
 * triggered by the webhook path instead of the frontend verification path.
 */
export class EventJobWebhookHandler {
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
        return { status: 200, message: 'Skipped: missing entity details for event booking' };
      }

      // Idempotency check: already confirmed?
      const existingBooking = await EventJob.findById(entityId).lean();
      if (!existingBooking) {
        return { status: 200, message: 'Skipped: Event booking not found' };
      }
      if (
        existingBooking.status === 'confirmed' ||
        existingBooking.status === 'team_assigned' ||
        existingBooking.status === 'setup_in_progress' ||
        existingBooking.status === 'completed'
      ) {
        logger.info(
          `[EVENT BOOKING WEBHOOK] Booking ${entityId} already confirmed. Idempotent skip.`,
        );
        return { status: 200, message: 'Booking already confirmed' };
      }
      if (existingBooking.razorpayPaymentId === razorpay_payment_id) {
        logger.info(
          `[EVENT BOOKING WEBHOOK] Payment ${razorpay_payment_id} already processed for booking ${entityId}`,
        );
        return { status: 200, message: 'Payment already processed for this booking' };
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const booking = await EventJob.findOneAndUpdate(
          {
            _id: entityId,
            razorpayOrderId: razorpay_order_id,
            status: { $in: ['pending_payment', 'payment_processing', 'failed'] },
          },
          { $set: { status: 'payment_processing' } },
          { new: true, session },
        );

        if (!booking) {
          await session.abortTransaction();
          return { status: 200, message: 'Booking not in payable state or already processed' };
        }

        // Amount validation
        const expectedAmount = booking.pricing.depositAmount * 100;
        const isAmountValid = paymentEntity.amount === expectedAmount;
        const isCurrencyValid = paymentEntity.currency === 'INR';
        const isValid = isAmountValid && isCurrencyValid;

        // PaymentAudit entry
        await PaymentAudit.create(
          [
            {
              orderId: booking._id,
              userId: booking.user,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              eventType: 'webhook_received',
              status: isValid ? 'success' : 'tampered',
              amountExpected: expectedAmount,
              amountReceived: Number(paymentEntity.amount),
              currencyReceived: String(paymentEntity.currency),
              signatureValid: true,
              notes: `Event booking webhook. Amount: ${isAmountValid}, Currency: ${isCurrencyValid}, Event: ${event}`,
              rawPayload: JSON.stringify(paymentEntity),
            },
          ],
          { session },
        );

        if (!isValid) {
          booking.status = 'failed';
          booking.payments?.push({
            amount: booking.pricing.depositAmount,
            date: new Date(),
            transactionId: razorpay_payment_id,
            status: 'failed',
            note: `Webhook validation failed. Expected INR ${expectedAmount / 100}, received ${paymentEntity.currency} ${paymentEntity.amount / 100}`,
          });
          booking.statusHistory.push({
            status: 'failed',
            timestamp: new Date(),
            note: 'Payment validation failed via webhook â€” amount or currency mismatch',
            updatedBy: 'system',
          });
          await booking.save({ session });

          await OutboxEvent.create(
            [
              {
                aggregateId: booking._id.toString(),
                aggregateType: 'EventJob',
                eventType: 'PaymentFailed',
                payload: { bookingId: booking._id.toString() },
              },
            ],
            { session },
          );

          await mongoose
            .model('PaymentWebhookEvent')
            .updateOne(
              { razorpayEventId: eventId },
              { $set: { status: 'processed', updatedAt: new Date() } },
            )
            .session(session);

          await session.commitTransaction();

          // Auto-refund tampered payment
          if (paymentEntity.status === 'captured') {
            try {
              await PaymentRefundService.initiateAsyncRefund({
                amount: paymentEntity.amount / 100,
                currency: 'INR',
                originalTransactionId: razorpay_payment_id,
                entityType: 'EventJob',
                entityId: booking._id,
              });
            } catch (refundErr) {
              Sentry.captureException(refundErr, {
                tags: { critical: 'booking_webhook_tampered' },
                extra: { razorpay_payment_id, bookingId: booking._id },
              });
            }
          }

          return { status: 200, message: 'Webhook processed but booking validation failed' };
        }

        // Double booking check (same logic as verifyBookingCheckout)
        const bDate = new Date(booking.date);
        const startOfDay = new Date(bDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bDate);
        endOfDay.setHours(23, 59, 59, 999);

        const slotsUsed = await EventJob.countDocuments({
          _id: { $ne: booking._id },
          date: { $gte: startOfDay, $lte: endOfDay },
          status: {
            $in: ['confirmed', 'setup_in_progress', 'payment_processing', 'team_assigned'],
          },
        }).session(session);

        const MAX_EVENTS_PER_DAY = 3;
        if (slotsUsed >= MAX_EVENTS_PER_DAY) {
          booking.status = 'failed';
          booking.payments?.push({
            amount: booking.pricing.depositAmount,
            date: new Date(),
            transactionId: razorpay_payment_id,
            status: 'failed',
            note: 'Payment captured but date became fully booked concurrently. Refund required.',
          });
          booking.statusHistory.push({
            status: 'failed',
            timestamp: new Date(),
            note: 'Date fully booked â€” automatic refund initiated via webhook',
            updatedBy: 'system',
          });
          await booking.save({ session });

          await mongoose
            .model('PaymentWebhookEvent')
            .updateOne(
              { razorpayEventId: eventId },
              { $set: { status: 'processed', updatedAt: new Date() } },
            )
            .session(session);

          await session.commitTransaction();

          await PaymentRefundService.initiateAsyncRefund({
            amount: booking.pricing.depositAmount,
            currency: 'INR',
            originalTransactionId: razorpay_payment_id,
            entityType: 'EventJob',
            entityId: booking._id,
          }).catch((err: any) =>
            logger.error(
              `[CRITICAL] Failed to enqueue refund for booking overlap via webhook: ${booking._id}`,
              err,
            ),
          );

          return { status: 200, message: 'Date fully booked, refund initiated' };
        }

        // SUCCESS: Confirm the booking
        EventJobStateMachine.transition(
          booking,
          'confirmed',
          'Payment confirmed via Razorpay webhook',
          'system',
        );
        booking.razorpayPaymentId = razorpay_payment_id;
        booking.razorpaySignature = signature;
        booking.clientApproved = true;
        booking.pricing.paymentStatus = 'partial';
        booking.pricing.pendingBalance = booking.pricing.totalPrice - booking.pricing.depositAmount;

        booking.payments?.push({
          amount: booking.pricing.depositAmount,
          date: new Date(),
          transactionId: razorpay_payment_id,
          status: 'success',
          note: 'Deposit captured via Razorpay webhook (browser close recovery)',
        });

        await BookingMessage.create(
          [
            {
              bookingId: booking._id,
              sender: 'admin',
              message:
                'Payment verified via our secure payment system! Your event booking is now CONFIRMED.',
              timestamp: new Date(),
            },
          ],
          { session },
        );

        await booking.save({ session });

        await OutboxEvent.create(
          [
            {
              aggregateId: booking._id.toString(),
              aggregateType: 'EventJob',
              eventType: 'BookingConfirmed',
              payload: { bookingId: booking._id.toString(), userId: booking.user.toString() },
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
          `[EVENT BOOKING WEBHOOK] Successfully confirmed booking ${booking.bookingId || booking._id} via webhook`,
        );

        return { status: 200, message: 'Event booking confirmed via webhook' };
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
        const booking = await EventJob.findOneAndUpdate(
          {
            _id: entityId,
            razorpayOrderId: razorpay_order_id,
            status: { $in: ['pending_payment', 'payment_processing'] },
          },
          { $set: { status: 'failed' } },
          { new: true, session },
        );

        if (booking) {
          booking.payments?.push({
            amount: booking.pricing.depositAmount,
            date: new Date(),
            transactionId: razorpay_payment_id,
            status: 'failed',
            note: 'Payment failed â€” Razorpay webhook notification',
          });
          booking.statusHistory.push({
            status: 'failed',
            timestamp: new Date(),
            note: 'Payment failed via Razorpay webhook',
            updatedBy: 'system',
          });
          await booking.save({ session });

          await OutboxEvent.create(
            [
              {
                aggregateId: booking._id.toString(),
                aggregateType: 'EventJob',
                eventType: 'PaymentFailed',
                payload: { bookingId: booking._id.toString() },
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

    return { status: 200, message: 'Event booking webhook processed' };
  }
}
