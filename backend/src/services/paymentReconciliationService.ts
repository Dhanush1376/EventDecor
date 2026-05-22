import Order from '../models/Order';
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
      $or: [{ razorpayPaymentId: { $exists: false } }, { razorpayPaymentId: null }, { razorpayPaymentId: '' }],
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
      discrepancies.push({
        orderId: String(o._id),
        issue: 'failed_but_has_razorpay_payment_id',
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        razorpayOrderId: o.razorpayOrderId,
        razorpayPaymentId: o.razorpayPaymentId,
        total: o.total,
        createdAt: o.createdAt,
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
}
