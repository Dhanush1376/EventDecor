import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { RazorpayGateway } from '../utils/payment/RazorpayGateway';
import PaymentAudit from '../models/PaymentAudit';
import OutboxEvent from '../models/OutboxEvent';
import * as Sentry from '@sentry/node';
import { InventoryService } from './InventoryService';
import Product from '../models/Product';
import User from '../models/User';
import AnalyticsService from './analyticsService';
import PaymentAttempt from '../models/PaymentAttempt';
import PaymentEvent from '../domains/payments/models/PaymentEvent';
import Coupon from '../models/Coupon';
import { generateUuid } from '../shared/utils/uuidGenerator';
import WalletTransaction from '../models/WalletTransaction';
import { debitWalletBalance } from '../utils/payment/walletMutations';
import RentalOrder from '../models/RentalOrder';
import { RentalAvailabilityService } from './rentals/RentalAvailabilityService';
import EventJob from '../domains/event_operations/models/EventJob';
import { EventResourcePlanningService } from './eventBooking/EventResourcePlanningService';
import BookingMessage from '../models/BookingMessage';
import { PaymentRefundService } from './PaymentRefundService';
import { RuleEngine } from '../domains/rules/services/RuleEngine';

export class PaymentVerificationService {
  static async verifyPayment(
    paymentData: any,
    invokerId: string,
    role: string,
    source: 'frontend' | 'webhook' = 'frontend',
    externalSession?: mongoose.ClientSession,
  ) {
    const razorpay_order_id = paymentData.razorpay_order_id || paymentData.razorpayOrderId;
    const razorpay_payment_id = paymentData.razorpay_payment_id || paymentData.razorpayPaymentId;
    const razorpay_signature = paymentData.razorpay_signature || paymentData.razorpaySignature;

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new ApiError(400, 'Missing payment verification parameters');
    }

    if (source === 'frontend' && !razorpay_signature) {
      throw new ApiError(400, 'Missing payment signature');
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
      source === 'webhook'
        ? true
        : expectedHash.length === signatureHash.length &&
          crypto.timingSafeEqual(expectedHash, signatureHash);

    // Fetch payment from Razorpay API BEFORE starting the transaction
    let fetchedPayment;
    try {
      fetchedPayment = await RazorpayGateway.getPayment(razorpay_payment_id);
    } catch (err: any) {
      logger.error(`Failed to fetch payment ${razorpay_payment_id} from Razorpay:`, err);
      throw new ApiError(502, 'Failed to connect to payment gateway for verification');
    }

    const session = externalSession || (await mongoose.startSession());
    if (!externalSession) session.startTransaction();
    let finalOrder: any;

    let attempt: any;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const processingNode = process.env.HOSTNAME || require('os').hostname();

      attempt = await PaymentAttempt.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
          $or: [
            { status: { $in: ['initiated', 'failed'] } },
            { status: 'processing', leaseExpiresAt: { $lt: fiveMinutesAgo } },
          ],
        },
        {
          $set: {
            status: 'processing',
            processingBy: processingNode,
            leaseExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        },
        { returnDocument: 'after', session },
      );

      if (!attempt) {
        const existingAttempt = await PaymentAttempt.findOne({
          razorpayOrderId: razorpay_order_id,
        }).session(session);
        if (existingAttempt && existingAttempt.status === 'success') {
          logger.info(
            `[PAYMENT REDUNDANCY] Payment already processed successfully for intent: ${existingAttempt._id}`,
          );

          let existingDoc;
          if (existingAttempt.type === 'purchase') {
            existingDoc = await Order.findById(existingAttempt.orderData.pendingOrderId).session(
              session,
            );
          } else if (existingAttempt.type === 'rental') {
            existingDoc = await RentalOrder.findById(
              existingAttempt.orderData.pendingOrderId,
            ).session(session);
          } else if (existingAttempt.type === 'event_booking') {
            existingDoc = await EventJob.findById(existingAttempt.orderData.pendingOrderId).session(
              session,
            );
          }

          if (!externalSession) {
            await session.abortTransaction();
            session.endSession();
          }
          return existingDoc;
        }
        if (existingAttempt && existingAttempt.status === 'processing') {
          logger.info(
            `[PAYMENT RACE] Intent ${existingAttempt._id} is actively being processed by a webhook.`,
          );
          if (!externalSession) {
            await session.abortTransaction();
            session.endSession();
          }
          // Ideally poll here, but for now just return error to let client retry
          throw new ApiError(
            409,
            'Payment is currently being processed. Please check back in a few seconds.',
          );
        }
        throw new ApiError(404, 'Checkout intent not found or cannot be locked for processing');
      }

      if (attempt.userId.toString() !== invokerId && role !== 'admin') {
        attempt.status = 'initiated';
        await attempt.save({ session });
        throw new ApiError(403, 'You are not authorized to verify this payment');
      }

      const userId = attempt.userId.toString();

      const expectedAmount = Math.round(
        attempt.type === 'purchase' || attempt.type === 'rental'
          ? attempt.orderData.total * 100
          : attempt.orderData.depositAmount * 100,
      );

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
            orderId: attempt.orderData.pendingOrderId, // Assuming we use pendingOrderId for all
            userId: attempt.userId,
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
        attempt.status = 'failed';
        await attempt.save({ session });

        if (attempt.orderData?.reservationIds?.length > 0) {
          for (const resId of attempt.orderData.reservationIds) {
            try {
              await InventoryService.cancelReservation(resId.toString(), session);
            } catch (err) {
              logger.error(`Failed to cancel reservation ${resId} on failed payment:`, err);
            }
          }
        }

        // External side-effects are now handled via Outbox Pattern AFTER rollback
        // So we rollback the active transaction immediately.
        if (!externalSession) {
          await session.abortTransaction();
          session.endSession();
        }

        // Persist the failed-payment audit event OUTSIDE the main transaction boundary
        // to ensure it is durably recorded despite the rollback of business state.
        try {
          await PaymentEvent.create([
            {
              eventId: generateUuid(),
              orderId: attempt.orderData.pendingOrderId,
              orderType: attempt.type,
              eventType: 'failed',
              amount: expectedAmount / 100,
              currency: 'INR',
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              performedBy: 'system',
              gatewayResponse: fetchedPayment,
            },
          ]);
        } catch (auditErr) {
          logger.error('Failed to save PaymentEvent audit after rollback:', auditErr);
        }

        if (fetchedPayment && fetchedPayment.status === 'captured') {
          try {
            await OutboxEvent.create({
              aggregateId: attempt.orderData.pendingOrderId.toString(),
              aggregateType:
                attempt.type === 'purchase'
                  ? 'Order'
                  : attempt.type === 'rental'
                    ? 'RentalOrder'
                    : 'EventJob',
              eventType: 'RefundRequested',
              payload: {
                razorpayPaymentId: razorpay_payment_id,
                amount: Number(fetchedPayment.amount),
                reason: 'tampered_signature',
              },
            });
            logger.info(
              `[PAYMENT REFUND] Scheduled outbox refund for tampered captured payment ${razorpay_payment_id}`,
            );
          } catch (refundErr) {
            Sentry.captureException(refundErr, {
              tags: { critical: 'checkout_failure', tampered: 'true' },
              extra: { razorpay_payment_id },
            });
          }
        }

        Sentry.captureException(new Error(`Payment untrusted for attempt ${attempt._id}`), {
          tags: { critical: 'checkout_failure' },
          extra: { attemptId: attempt._id, razorpay_order_id, razorpay_payment_id },
        });

        throw new ApiError(400, 'Invalid payment details. Payment untrusted.');
      }

      await PaymentEvent.create(
        [
          {
            eventId: generateUuid(),
            orderId: attempt.orderData.pendingOrderId,
            orderType: attempt.type,
            eventType: 'paid',
            amount: expectedAmount / 100,
            currency: 'INR',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            performedBy: 'system',
            gatewayResponse: fetchedPayment,
          },
        ],
        { session },
      );

      // Valid payment. Let's create the actual order/booking based on attempt.type
      const orderData = attempt.orderData;

      if (attempt.type === 'purchase') {
        // --- PURCHASE VERIFICATION ---
        if (orderData.couponCode) {
          const couponDoc = await Coupon.findOneAndUpdate(
            { code: orderData.couponCode, isActive: true },
            {
              $inc: { usedCount: 1 },
              $push: { usedBy: { userId, orderId: orderData.pendingOrderId } },
            },
            { session, returnDocument: 'after' },
          );
          if (!couponDoc) {
            logger.warn(
              `Coupon ${orderData.couponCode} became invalid during processing, but order is paid. Continuing.`,
            );
          }
        }

        if (orderData.walletDeduction > 0) {
          const user = await User.findById(userId).session(session);
          if (user && user.walletBalance >= orderData.walletDeduction) {
            await debitWalletBalance(userId, orderData.walletDeduction, session);
            await WalletTransaction.create(
              [
                {
                  userId,
                  type: 'debit',
                  amount: orderData.walletDeduction,
                  source: 'checkout_redeem',
                  description: `Redeemed Siri Cash at checkout`,
                  status: 'active',
                },
              ],
              { session },
            );
          }
        }

        for (const item of orderData.orderItems) {
          if (item.productId) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { sold: item.quantity || 1 } },
              { session },
            );
          }
        }

        const orderedProductIds = orderData.orderItems.map((item: any) => item.productId);
        await User.findByIdAndUpdate(
          userId,
          { $pull: { cart: { product: { $in: orderedProductIds } } } },
          { session },
        );

        // Apply rules engine
        let initialStatus = 'Confirmed';
        let initialNote = 'Payment verified and order confirmed';
        const evalResult = await RuleEngine.evaluate(orderData, 'Order', session);
        if (evalResult.requiresApproval) {
          initialStatus = 'On Hold';
          initialNote = 'Order flagged by business rules. Placed On Hold pending admin approval.';

          if (orderData.reservationIds && orderData.reservationIds.length > 0) {
            for (const resId of orderData.reservationIds) {
              await InventoryService.freezeReservation(resId.toString(), 7, session);
            }
          }
        } else {
          if (orderData.reservationIds && orderData.reservationIds.length > 0) {
            for (const resId of orderData.reservationIds) {
              await InventoryService.confirmReservation(resId.toString(), session);
            }
          }
        }

        if (orderData.isCustomOrder && orderData.customOrderId) {
          const CustomOrder = require('../models/CustomOrder').default;
          await CustomOrder.findByIdAndUpdate(
            orderData.customOrderId,
            {
              convertedToOrder: true,
              convertedOrderId: orderData.pendingOrderId,
              status: 'Payment Received',
            },
            { session },
          );
        }

        finalOrder = await Order.create(
          [
            {
              _id: orderData.pendingOrderId,
              user: userId,
              items: orderData.orderItems,
              shippingAddress: orderData.shippingAddress,
              subtotal: orderData.subtotal,
              shippingFee: orderData.shippingFee,
              discount: orderData.discount,
              codFee: orderData.codFee,
              walletDeduction: orderData.walletDeduction,
              total: orderData.total,
              couponCode: orderData.couponCode,
              paymentMethod: orderData.paymentMethod,
              paymentStatus: 'paid',
              orderStatus: initialStatus as any,
              reservationIds: orderData.reservationIds,
              statusHistory: [
                {
                  status: initialStatus as any,
                  note: initialNote,
                },
              ],
              invoiceNumber: orderData.invoiceNumber,
              trackingNumber: orderData.trackingNumber,
              courierPartner: orderData.courierPartner,
              barcodeData: orderData.barcodeData,
              qrCodeData: orderData.qrCodeData,
              notes: orderData.notes,
              needByDate: orderData.needByDate,
              idempotencyKey: orderData.idempotencyKey,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              isCustomOrder: orderData.isCustomOrder,
              customOrderId: orderData.customOrderId,
            },
          ],
          { session },
        ).then((res) => res[0] as any);

        await OutboxEvent.create(
          [
            {
              aggregateId: finalOrder._id.toString(),
              aggregateType: 'Order',
              eventType: 'OrderCreated',
              payload: {
                orderId: finalOrder._id.toString(),
                userId: userId,
                type: 'online',
                amount: finalOrder.total,
              },
            },
          ],
          { session },
        );
      } else if (attempt.type === 'rental') {
        // --- RENTAL VERIFICATION ---
        await RentalAvailabilityService.confirmDates(orderData.pendingOrderId.toString(), session);

        let initialStatus = 'confirmed';
        let initialNote = 'Payment verified and rental order confirmed';
        const evalResult = await RuleEngine.evaluate(orderData, 'RentalOrder', session);
        if (evalResult.requiresApproval) {
          initialStatus = 'pending_approval';
          initialNote = 'Rental flagged by business rules. Pending admin approval.';
        }

        finalOrder = await RentalOrder.create(
          [
            {
              _id: orderData.pendingOrderId,
              user: userId,
              product: orderData.product,
              productTitle: orderData.productTitle,
              productImage: orderData.productImage,
              rentalStartDate: orderData.rentalStartDate,
              rentalEndDate: orderData.rentalEndDate,
              durationDays: orderData.durationDays,
              rentalRate: orderData.rentalRate,
              rentalCharge: orderData.rentalCharge,
              securityDeposit: orderData.securityDeposit,
              deliveryCharge: orderData.deliveryCharge,
              tax: orderData.tax,
              totalAmount: orderData.totalAmount,
              paymentMethod: 'razorpay',
              paymentStatus: 'paid',
              shippingAddress: orderData.shippingAddress,
              identityDocuments: orderData.identityDocuments,
              agreementAcceptedAt: orderData.agreementAcceptedAt,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              status: initialStatus as any,
              statusHistory: [
                {
                  status: initialStatus as any,
                  note: initialNote,
                },
              ],
            },
          ],
          { session },
        ).then((res: any) => res[0]);

        await OutboxEvent.create(
          [
            {
              aggregateId: finalOrder._id.toString(),
              aggregateType: 'RentalOrder',
              eventType: 'RentalCreated',
              payload: { orderId: finalOrder._id.toString(), userId, type: 'online' },
            },
          ],
          { session },
        );
      } else if (attempt.type === 'event_booking') {
        // --- EVENT BOOKING VERIFICATION ---
        try {
          await EventResourcePlanningService.claimSlotAtomically(
            new Date(orderData.date),
            orderData.pendingOrderId.toString(),
            session,
          );
        } catch (err: any) {
          if (err.statusCode === 409) {
            // Initiate refund since date is now full
            await PaymentRefundService.initiateAsyncRefund({
              amount: orderData.depositAmount,
              currency: 'INR',
              originalTransactionId: razorpay_payment_id,
              entityType: 'EventJob',
              entityId: orderData.pendingOrderId,
            }).catch((refundErr: any) =>
              logger.error(
                `[CRITICAL] Failed to enqueue refund for event booking overlap:`,
                refundErr,
              ),
            );
            throw new ApiError(
              409,
              'Payment was successful, but the date was just fully booked by others. A full refund will be processed within 5-7 business days.',
            );
          }
          throw err;
        }

        finalOrder = await EventJob.create(
          [
            {
              _id: orderData.pendingOrderId,
              bookingId: orderData.bookingId || orderData.pendingOrderId.toString(),
              user: userId,
              eventPackage: orderData.eventPackage,
              title: orderData.title,
              eventType: orderData.eventType,
              date: orderData.date,
              rentalDurationDays: orderData.rentalDurationDays,
              timing: orderData.timing,
              guestCount: orderData.guestCount,
              venue: orderData.venue,
              customization: orderData.customization,
              selectedAddons: orderData.selectedAddons,
              inspirationImages: orderData.inspirationImages,
              pricing: {
                rentalFee: orderData.basePrice,
                setupCharges: 0,
                transportationCost: 0,
                addOnCharges: orderData.addOnCharges,
                depositAmount: orderData.depositAmount,
                totalPrice: orderData.totalPrice,
                pendingBalance: orderData.totalPrice - orderData.depositAmount,
                paymentStatus: 'partial',
              },
              payments: [
                {
                  amount: orderData.depositAmount,
                  date: new Date(),
                  transactionId: razorpay_payment_id,
                  status: 'success',
                  note: 'Initial 50% deposit via Razorpay',
                },
              ],
              status: 'confirmed',
              statusHistory: [
                {
                  status: 'confirmed',
                  timestamp: new Date(),
                  note: 'Payment verified and booking confirmed',
                  updatedBy: userId,
                },
              ],
              clientApproved: true,
              idempotencyKey: orderData.idempotencyKey,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
            },
          ],
          { session },
        ).then((res: any) => res[0]);

        await BookingMessage.create(
          [
            {
              bookingId: finalOrder._id,
              sender: 'admin',
              message:
                'Payment verified! Your luxury event design is now CONFIRMED. Our artisans will review your floorplans.',
              timestamp: new Date(),
            },
          ],
          { session },
        );

        await OutboxEvent.create(
          [
            {
              aggregateId: finalOrder._id.toString(),
              aggregateType: 'EventJob',
              eventType: 'BookingConfirmed',
              payload: { bookingId: finalOrder._id.toString(), userId },
            },
          ],
          { session },
        );
      }

      attempt.status = 'success';
      await attempt.save({ session });

      try {
        const { RuleEngine } = require('../domains/rules/services/RuleEngine');
        const userForRule = await User.findById(userId).lean().session(session);
        await RuleEngine.evaluateTrigger('on_checkout', { user: userForRule, order: finalOrder });
      } catch (ruleErr) {
        logger.error('Failed to evaluate checkout rules (online):', ruleErr);
      }

      if (!externalSession) await session.commitTransaction();
    } catch (error) {
      if (!externalSession && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (!externalSession) session.endSession();
    }

    AnalyticsService.clearCache();
    logger.info(`Payment verified and entity created successfully: ${finalOrder._id}`);

    return finalOrder;
  }
}
