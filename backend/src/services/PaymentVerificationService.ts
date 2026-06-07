import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { RazorpayGateway } from '../utils/RazorpayGateway';
import PaymentAudit from '../models/PaymentAudit';
import { PaymentStateMachine } from './payments/PaymentStateMachine';
import OutboxEvent from '../models/OutboxEvent';
import * as Sentry from '@sentry/node';
import { InventoryService } from './InventoryService';
import Product from '../models/Product';
import InventoryLog from '../models/InventoryLog';
import User from '../models/User';
import AnalyticsService from './analyticsService';

export class PaymentVerificationService {
  static async verifyPayment(paymentData: any, userId: string, role: string) {
    const razorpay_order_id = paymentData.razorpay_order_id || paymentData.razorpayOrderId;
    const razorpay_payment_id = paymentData.razorpay_payment_id || paymentData.razorpayPaymentId;
    const razorpay_signature = paymentData.razorpay_signature || paymentData.razorpaySignature;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(400, 'Missing payment verification parameters');
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      throw new ApiError(500, 'Payment verification is not configured on the server');
    }

    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');
    const expectedHash = Buffer.from(digest, 'utf8');
    const signatureHash = Buffer.from(razorpay_signature || '', 'utf8');
    const isSignatureValid =
      expectedHash.length === signatureHash.length &&
      crypto.timingSafeEqual(expectedHash, signatureHash);

    // Fetch payment from Razorpay API BEFORE starting the transaction
    let fetchedPayment;
    try {
      fetchedPayment = await RazorpayGateway.getPayment(razorpay_payment_id);
    } catch (err: any) {
      logger.error(`Failed to fetch payment ${razorpay_payment_id} from Razorpay:`, err);
      throw new ApiError(502, 'Failed to connect to payment gateway for verification');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    let order: any;

    try {
      order = await Order.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
          paymentStatus: { $in: ['pending', 'failed'] },
        } as any,
        { $set: { paymentStatus: 'processing' } },
        { returnDocument: 'after', session },
      );

      if (!order) {
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingOrder && existingOrder.paymentStatus === 'paid') {
          logger.info(
            `[PAYMENT REDUNDANCY] Payment already processed successfully for order: ${existingOrder._id}`,
          );
          await session.abortTransaction();
          session.endSession();
          return existingOrder;
        }
        if (existingOrder && existingOrder.paymentStatus === 'processing') {
          logger.info(
            `[PAYMENT RACE] Order ${existingOrder._id} is actively being processed by a webhook.`,
          );
          await session.abortTransaction();
          session.endSession();
          return existingOrder;
        }
        throw new ApiError(404, 'Order record not found or cannot be locked for processing');
      }

      if (order.user.toString() !== userId && role !== 'admin') {
        order.paymentStatus = 'pending';
        await order.save({ session });
        throw new ApiError(403, 'You are not authorized to verify this payment');
      }

      const expectedAmount = Math.round(order.total * 100);
      const isAmountValid = Number(fetchedPayment.amount) === expectedAmount;
      const isCurrencyValid = fetchedPayment.currency === 'INR';
      const isOrderValid = fetchedPayment.order_id === razorpay_order_id;
      const isStatusValid =
        fetchedPayment.status === 'captured' || fetchedPayment.status === 'authorized';

      const isValid =
        isSignatureValid && isAmountValid && isCurrencyValid && isOrderValid && isStatusValid;

      await PaymentAudit.create(
        [
          {
            orderId: order._id,
            userId: userId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            eventType: 'verification_attempt',
            status: isValid ? 'success' : !isSignatureValid ? 'failed' : 'tampered',
            amountExpected: expectedAmount,
            amountReceived: Number(Number(fetchedPayment.amount)),
            currencyReceived: String(fetchedPayment.currency),
            signatureValid: isSignatureValid,
            notes: `Signature: ${isSignatureValid}, Amount Match: ${isAmountValid}, Status: ${fetchedPayment.status}`,
            rawPayload: JSON.stringify(fetchedPayment),
          },
        ],
        { session },
      );

      if (!isValid) {
        await session.abortTransaction();

        await PaymentAudit.create({
          orderId: order._id,
          userId: userId,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          eventType: 'verification_attempt',
          status: !isSignatureValid ? 'failed' : 'tampered',
          amountExpected: expectedAmount,
          amountReceived: Number(Number(fetchedPayment.amount)),
          currencyReceived: String(fetchedPayment.currency),
          signatureValid: isSignatureValid,
          notes: `Signature: ${isSignatureValid}, Amount Match: ${isAmountValid}, Status: ${fetchedPayment.status}`,
          rawPayload: JSON.stringify(fetchedPayment),
        });

        session.endSession();

        if (fetchedPayment && fetchedPayment.status === 'captured') {
          try {
            await RazorpayGateway.initiateRefund(razorpay_payment_id, {
              amount: Number(fetchedPayment.amount),
            });
            logger.info(
              `[PAYMENT REFUND] Automatically refunded tampered captured payment ${razorpay_payment_id}`,
            );
          } catch (refundErr) {
            Sentry.captureException(refundErr, {
              tags: { critical: 'checkout_failure', tampered: 'true' },
              extra: { razorpay_payment_id },
            });
          }
        }

        Sentry.captureException(new Error(`Payment untrusted for order ${order._id}`), {
          tags: { critical: 'checkout_failure' },
          extra: { orderId: order._id, razorpay_order_id, razorpay_payment_id },
        });

        throw new ApiError(400, 'Invalid payment details. Payment untrusted.');
      }

      // Confirm inventory reservations via InventoryService (with audit trail)
      if (order.reservationIds && order.reservationIds.length > 0) {
        for (const resId of order.reservationIds) {
          await InventoryService.confirmReservation(resId.toString(), session);
        }
      } else {
        // Fallback if older order without reservations
        for (const item of order.items) {
          const product = await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity, reservedStock: -item.quantity } },
            { session, returnDocument: 'after' },
          );

          if (product) {
            await InventoryLog.create(
              [
                {
                  product: item.productId,
                  previousStock: product.stock + item.quantity,
                  newStock: product.stock,
                  delta: -item.quantity,
                  reason: 'order_placed',
                  orderId: order._id.toString(),
                  performedBy: 'system',
                  note: `Direct deduction for legacy order verification (no reservation found)`,
                },
              ],
              { session },
            );
          }
        }
      }

      for (const item of order.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { sold: item.quantity || 1 } },
            { session },
          );
        }
      }

      PaymentStateMachine.transition(order, 'paid', 'Payment verified and order confirmed');
      order.orderStatus = 'Confirmed';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.statusHistory.push({
        status: 'Confirmed',
        note: 'Payment verified and order confirmed',
      });

      await order.save({ session });

      // Use Outbox Pattern to decouple side-effects (e.g. Emails, PDFs)
      await OutboxEvent.create(
        [
          {
            aggregateId: order._id.toString(),
            aggregateType: 'Order',
            eventType: 'OrderCreated',
            payload: {
              orderId: order._id.toString(),
              userId: userId,
              type: 'online',
              amount: order.total,
            },
          },
        ],
        { session },
      );

      // Assuming cart clearance should be an event too, but doing it directly for user is fine
      await User.findByIdAndUpdate(order.user, { $set: { cart: [] } }, { session });

      await session.commitTransaction();
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }

    AnalyticsService.clearCache();

    logger.info(`Payment successful for order: ${order._id}`);
    return order;
  }
}
