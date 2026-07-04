import Order from '../models/Order';
import EventBooking from '../models/EventBooking';
import RentalOrder from '../models/RentalOrder';
import logger from '../config/logger';
import * as Sentry from '@sentry/node';

export type PaymentDiscrepancy = {
  orderId: string;
  issue: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  total: number;
  createdAt: Date;
};

export type ReconciliationReport = {
  scannedAt: string;
  discrepancyCount: number;
  discrepancies: PaymentDiscrepancy[];
};

/**
 * Finds Razorpay vs Order collection mismatches (revenue leakage / stuck orders).
 */
export class PaymentReconciliationService {
  static async runReport(): Promise<ReconciliationReport> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const discrepancies: PaymentDiscrepancy[] = [];

    const paidMissingPaymentId = await Order.find({
      paymentStatus: 'paid',
      paymentMethod: /razorpay/i,
      $or: [
        { razorpayPaymentId: { $exists: false } },
        { razorpayPaymentId: null },
        { razorpayPaymentId: '' },
      ],
    })
      .select('_id paymentStatus orderStatus razorpayOrderId razorpayPaymentId total createdAt')
      .limit(200)
      .lean();

    for (const o of paidMissingPaymentId) {
      discrepancies.push({
        orderId: String(o._id),
        issue: 'paid_without_razorpay_payment_id',
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        razorpayOrderId: o.razorpayOrderId,
        razorpayPaymentId: o.razorpayPaymentId,
        total: o.total,
        createdAt: o.createdAt,
      });
    }

    const pendingWithRazorpayStale = await Order.find({
      paymentStatus: 'pending',
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $lt: oneHourAgo },
      orderStatus: 'Pending',
    })
      .select('_id paymentStatus orderStatus razorpayOrderId razorpayPaymentId total createdAt')
      .limit(200)
      .lean();

    for (const o of pendingWithRazorpayStale) {
      discrepancies.push({
        orderId: String(o._id),
        issue: 'stale_pending_with_razorpay_order',
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        razorpayOrderId: o.razorpayOrderId,
        razorpayPaymentId: o.razorpayPaymentId,
        total: o.total,
        createdAt: o.createdAt,
      });
    }

    const failedWithPaymentId = await Order.find({
      paymentStatus: 'failed',
      razorpayPaymentId: { $exists: true, $ne: '' },
    })
      .select('_id paymentStatus orderStatus razorpayOrderId razorpayPaymentId total createdAt')
      .limit(100)
      .lean();

    for (const o of failedWithPaymentId) {
      let rzpStatus = 'unknown';
      let rzpAmount = 0;
      try {
        const { RazorpayGateway } = require('../utils/payment/RazorpayGateway');
        if (o.razorpayPaymentId) {
          const payment = await RazorpayGateway.getPayment(o.razorpayPaymentId);
          rzpStatus = payment.status;
          rzpAmount = payment.amount;
        }
      } catch {
        // Ignore API errors during reconciliation
      }

      const issueLabel =
        rzpStatus === 'captured' || rzpStatus === 'authorized'
          ? 'revenue_leakage_failed_but_captured'
          : 'failed_but_has_razorpay_payment_id';

      if (issueLabel === 'revenue_leakage_failed_but_captured') {
        // Auto-heal by triggering webhook processing safely
        try {
          const { UnifiedWebhookRouter } = require('./payments/UnifiedWebhookRouter');
          logger.info(`[RECONCILE] Auto-healing revenue leakage for Order ${o._id}`);
          const webhookEvent = {
            payload: {
              payment: {
                entity: {
                  id: o.razorpayPaymentId,
                  order_id: o.razorpayOrderId,
                  amount: rzpAmount,
                  currency: 'INR',
                  status: rzpStatus,
                },
              },
            },
          };
          await UnifiedWebhookRouter.routeWebhookEvent(
            'order.paid',
            webhookEvent,
            'reconciliation',
            `recon_heal_${o._id}`,
          );
          // Successfully auto-healed, skip adding to discrepancies
          continue;
        } catch (healErr) {
          logger.error(`[RECONCILE] Auto-heal failed for Order ${o._id}:`, healErr);
        }
      }

      discrepancies.push({
        orderId: String(o._id),
        issue: issueLabel,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        razorpayOrderId: o.razorpayOrderId,
        razorpayPaymentId: o.razorpayPaymentId,
        total: o.total,
        createdAt: o.createdAt,
      });
    }

    // --- REFUND RECONCILIATION ---
    const RefundRecord =
      require('../models/RefundRecord').default || require('../models/RefundRecord');
    const stuckRefunds = await RefundRecord.find({
      status: 'processing',
      createdAt: { $lt: oneHourAgo },
    })
      .limit(100)
      .lean();

    for (const r of stuckRefunds) {
      discrepancies.push({
        orderId: String(r.entityId),
        issue: 'stuck_processing_refund',
        paymentStatus: 'refund_stuck',
        orderStatus: 'N/A',
        razorpayPaymentId: r.originalTransactionId,
        total: r.amount,
        createdAt: r.createdAt as Date,
      });
    }

    // --- RENTAL ORDER RECONCILIATION ---
    const paidMissingPaymentIdRentals = await RentalOrder.find({
      paymentStatus: 'paid',
      paymentMethod: /razorpay/i,
      $or: [
        { razorpayPaymentId: { $exists: false } },
        { razorpayPaymentId: null },
        { razorpayPaymentId: '' },
      ],
    })
      .select('_id paymentStatus status razorpayOrderId razorpayPaymentId totalAmount createdAt')
      .limit(200)
      .lean();

    for (const r of paidMissingPaymentIdRentals) {
      discrepancies.push({
        orderId: String(r._id),
        issue: 'rental_paid_without_razorpay_payment_id',
        paymentStatus: r.paymentStatus,
        orderStatus: r.status,
        razorpayOrderId: r.razorpayOrderId,
        razorpayPaymentId: r.razorpayPaymentId,
        total: r.totalAmount,
        createdAt: r.createdAt as Date,
      });
    }

    const pendingWithRazorpayStaleRentals = await RentalOrder.find({
      paymentStatus: 'pending',
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $lt: oneHourAgo },
      status: 'pending',
    })
      .select('_id paymentStatus status razorpayOrderId razorpayPaymentId totalAmount createdAt')
      .limit(200)
      .lean();

    for (const r of pendingWithRazorpayStaleRentals) {
      discrepancies.push({
        orderId: String(r._id),
        issue: 'rental_stale_pending_with_razorpay_order',
        paymentStatus: r.paymentStatus,
        orderStatus: r.status,
        razorpayOrderId: r.razorpayOrderId,
        razorpayPaymentId: r.razorpayPaymentId,
        total: r.totalAmount,
        createdAt: r.createdAt as Date,
      });
    }

    // --- EVENT BOOKING RECONCILIATION ---
    const paidMissingPaymentIdBookings = await EventBooking.find({
      'pricing.paymentStatus': { $in: ['partial', 'paid'] },
      $or: [
        { razorpayPaymentId: { $exists: false } },
        { razorpayPaymentId: null },
        { razorpayPaymentId: '' },
      ],
    })
      .select('_id pricing status razorpayOrderId razorpayPaymentId createdAt')
      .limit(200)
      .lean();

    for (const b of paidMissingPaymentIdBookings) {
      discrepancies.push({
        orderId: String(b._id),
        issue: 'booking_paid_without_razorpay_payment_id',
        paymentStatus: b.pricing?.paymentStatus || 'unpaid',
        orderStatus: b.status,
        razorpayOrderId: b.razorpayOrderId,
        razorpayPaymentId: b.razorpayPaymentId,
        total: b.pricing?.totalPrice || 0,
        createdAt: b.createdAt as Date,
      });
    }

    const pendingWithRazorpayStaleBookings = await EventBooking.find({
      status: { $in: ['pending_payment', 'payment_processing'] },
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $lt: oneHourAgo },
    })
      .select('_id pricing status razorpayOrderId razorpayPaymentId createdAt')
      .limit(200)
      .lean();

    for (const b of pendingWithRazorpayStaleBookings) {
      discrepancies.push({
        orderId: String(b._id),
        issue: 'booking_stale_pending_with_razorpay_order',
        paymentStatus: b.pricing?.paymentStatus || 'unpaid',
        orderStatus: b.status,
        razorpayOrderId: b.razorpayOrderId,
        razorpayPaymentId: b.razorpayPaymentId,
        total: b.pricing?.totalPrice || 0,
        createdAt: b.createdAt as Date,
      });
    }

    if (discrepancies.length > 0) {
      logger.warn(`[PAYMENT RECONCILE] Found ${discrepancies.length} discrepancy(ies)`);
      if (process.env.SENTRY_DSN) {
        Sentry.captureMessage('Payment reconciliation discrepancies detected', {
          level: 'warning',
          extra: { count: discrepancies.length, sample: discrepancies.slice(0, 5) },
        });
      }
    } else {
      logger.info('[PAYMENT RECONCILE] No discrepancies found');
    }

    return {
      scannedAt: new Date().toISOString(),
      discrepancyCount: discrepancies.length,
      discrepancies,
    };
  }

  /**
   * Automatically recovers orders that failed to link their razorpay_order_id during checkout.
   * If the order exists in Razorpay (via receipt ID), it links it. If not, it cancels the order.
   */
  static async autoRecoverOrphanedOrders(): Promise<number> {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // Bound the search

    const orphanedOrders = await Order.find({
      paymentStatus: 'pending',
      paymentMethod: /razorpay/i,
      $or: [
        { razorpayOrderId: { $exists: false } },
        { razorpayOrderId: null },
        { razorpayOrderId: '' },
      ],
      createdAt: { $lt: fifteenMinsAgo, $gte: twoHoursAgo },
      orderStatus: 'Pending',
    })
      .select('_id')
      .lean();

    if (orphanedOrders.length === 0) return 0;

    const { RazorpayGateway } = require('../utils/payment/RazorpayGateway');
    let recoveredCount = 0;

    for (const order of orphanedOrders) {
      try {
        const receiptId = `rcpt_${order._id}`;
        const response = await RazorpayGateway.getAllOrders({ receipt: receiptId });
        if (response && response.items && response.items.length > 0) {
          const rzpOrder = response.items[0];
          await Order.findByIdAndUpdate(order._id, {
            $set: { razorpayOrderId: rzpOrder.id },
          });
          logger.info(
            `[RECONCILE] Recovered Razorpay Order ID ${rzpOrder.id} for Order ${order._id}`,
          );
          recoveredCount++;
        } else {
          const { OrderFulfillmentService } = require('./orders/OrderFulfillmentService');
          await OrderFulfillmentService.updateOrderStatus(
            order._id.toString(),
            'Cancelled',
            'Auto-cancelled: Razorpay order was never successfully created during checkout.',
          );
        }
      } catch (err) {
        logger.error(`[RECONCILE] Failed to recover orphaned order ${order._id}:`, err);
      }
    }
    return recoveredCount;
  }

  /**
   * Automatically cancels orders that have been stuck in 'pending' with a razorpay_order_id for > 2 hours.
   * This releases locked stock and wallet balance, improving inventory utilization.
   */
  static async autoCancelAbandonedOrders(): Promise<number> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const abandonedOrders = await Order.find({
      paymentStatus: 'pending',
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $lt: twoHoursAgo },
      orderStatus: 'Pending',
    })
      .select('_id')
      .lean();

    if (abandonedOrders.length === 0) {
      return 0;
    }

    const { OrderFulfillmentService } = require('./orders/OrderFulfillmentService');
    const { UnifiedWebhookRouter } = require('./payments/UnifiedWebhookRouter');
    const { RazorpayGateway } = require('../utils/payment/RazorpayGateway');

    let cancelledCount = 0;

    const processAbandoned = async (
      entity: any,
      entityType: string,
      cancelCallback: (id: string, status: string) => Promise<void>,
    ) => {
      try {
        let actualStatus = 'created';
        try {
          const rzpOrder = await RazorpayGateway.getOrder(entity.razorpayOrderId);
          actualStatus = rzpOrder.status; // 'created', 'attempted', 'paid'
          if (actualStatus === 'paid') {
            logger.info(`[RECONCILE] Recovering missed payment for ${entityType} ${entity._id}`);
            let rzpPaymentId = `recon_${entity.razorpayOrderId}`; // Fallback only
            try {
              const payments = await RazorpayGateway.getOrderPayments(entity.razorpayOrderId);
              if (payments && payments.items && payments.items.length > 0) {
                const successfulPayment = payments.items.find(
                  (p: any) => p.status === 'captured' || p.status === 'authorized',
                );
                if (successfulPayment) {
                  rzpPaymentId = successfulPayment.id;
                }
              }
            } catch (e) {
              logger.warn(`Could not fetch payments for order ${entity.razorpayOrderId}`);
            }

            const webhookEvent = {
              payload: {
                payment: {
                  entity: {
                    id: rzpPaymentId,
                    order_id: entity.razorpayOrderId,
                    amount: rzpOrder.amount,
                    currency: 'INR',
                    status: 'captured',
                  },
                },
              },
            };
            await UnifiedWebhookRouter.routeWebhookEvent(
              'order.paid',
              webhookEvent,
              'reconciliation',
              rzpPaymentId,
            );
            return; // Successfully recovered
          }
        } catch {
          logger.warn(
            `[RECONCILE] Could not fetch Razorpay order ${entity.razorpayOrderId}, assuming abandoned.`,
          );
        }

        logger.info(
          `[RECONCILE] Auto-cancelling abandoned ${entityType} ${entity._id} (Razorpay Status: ${actualStatus})`,
        );
        await cancelCallback(entity._id.toString(), actualStatus);
        cancelledCount++;
      } catch (err) {
        logger.error(
          `[RECONCILE] Failed to auto-cancel abandoned ${entityType} ${entity._id}:`,
          err,
        );
      }
    };

    for (const order of abandonedOrders) {
      await processAbandoned(order, 'Order', async (id, status) => {
        await OrderFulfillmentService.updateOrderStatus(
          id,
          'Cancelled',
          `Auto-cancelled due to payment abandonment timeout (> 2 hours). Razorpay Status: ${status}`,
        );
      });
    }

    // Rental Orders
    const abandonedRentals = await RentalOrder.find({
      paymentStatus: 'pending',
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $lt: twoHoursAgo },
      status: 'pending',
    })
      .select('_id razorpayOrderId')
      .lean();

    for (const rental of abandonedRentals) {
      await processAbandoned(rental, 'RentalOrder', async (id, status) => {
        const r = await RentalOrder.findById(id);
        if (r) {
          r.status = 'cancelled';
          r.paymentStatus = 'failed';
          r.statusHistory.push({
            status: 'cancelled',
            note: `Auto-cancelled due to payment abandonment timeout (> 2 hours). Razorpay Status: ${status}`,
            performedBy: 'system',
          } as any);
          await r.save();
          // Release calendar
          const { RentalAvailabilityService } = require('./rentals/RentalAvailabilityService');
          await RentalAvailabilityService.releaseDates(r._id.toString());
        }
      });
    }

    // Event Bookings
    const abandonedBookings = await EventBooking.find({
      status: { $in: ['pending_payment', 'payment_processing'] },
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $lt: twoHoursAgo },
    })
      .select('_id razorpayOrderId')
      .lean();

    for (const booking of abandonedBookings) {
      await processAbandoned(booking, 'EventBooking', async (id, status) => {
        const b = await EventBooking.findById(id);
        if (b) {
          const { EventBookingStateMachine } = require('./eventBooking/EventBookingStateMachine');
          EventBookingStateMachine.transition(
            b,
            'cancelled',
            `Auto-cancelled due to payment abandonment timeout (> 2 hours). Razorpay Status: ${status}`,
            'system',
          );
          b.cancellationReason = 'payment_abandoned';
          await b.save();
        }
      });
    }

    if (cancelledCount > 0) {
      logger.info(`[RECONCILE] Successfully released stock for ${cancelledCount} abandoned orders`);
    }

    return cancelledCount;
  }
}
