import { type Types } from 'mongoose';
import Order from '../models/Order';
import logger from '../config/logger';
import { emitAdminNotification, emitUserEvent } from '../socket';
import { OrderFulfillmentService } from '../services/orders/OrderFulfillmentService';
import { PaymentStateMachine } from '../services/payments/PaymentStateMachine';
import * as Sentry from '@sentry/node';

const BATCH_SIZE = 50;
const STALE_NOTE =
  'Order cancelled due to payment timeout - stock, coupon, and wallet reservations released';

type StaleOrderRow = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
};

const staleOrderFilter = () => {
  const now = Date.now();
  return {
    $or: [
      {
        paymentStatus: 'pending' as const,
        orderStatus: 'Pending' as const,
        createdAt: { $lt: new Date(now - 15 * 60 * 1000) },
      },
      {
        paymentStatus: 'processing' as const,
        createdAt: { $lt: new Date(now - 5 * 60 * 1000) },
      },
      {
        paymentStatus: 'pending' as const,
        orderStatus: 'Pending' as const,
        $or: [
          { razorpayOrderId: { $exists: false } },
          { razorpayOrderId: null },
          { razorpayOrderId: '' },
        ],
        createdAt: { $lt: new Date(now - 3 * 60 * 1000) },
      },
    ],
  };
};

/**
 * Releases reservations and cancels stale online orders.
 *
 * Each order is claimed and reversed inside a MongoDB transaction. That avoids
 * stock leaks where inventory is restored but the order is not actually marked
 * cancelled, or the reverse: order cancelled without stock/coupon/wallet repair.
 */
export const releaseStalePendingOrders = async (): Promise<number> => {
  const cursor = Order.find(staleOrderFilter())
    .select('_id items user couponCode walletDeduction')
    .lean()
    .cursor();
  let processed = 0;
  let batch: StaleOrderRow[] = [];

  const flushBatch = async (orders: StaleOrderRow[]) => {
    if (orders.length === 0) return;

    const cancelledOrders: StaleOrderRow[] = [];

    for (const order of orders) {
      try {
        await OrderFulfillmentService.updateOrderStatus(
          order._id.toString(),
          'Cancelled',
          STALE_NOTE,
        );

        // Use PaymentStateMachine instead of raw updateOne to maintain state integrity
        const fullOrder = await Order.findById(order._id);
        if (
          fullOrder &&
          PaymentStateMachine.canTransition(fullOrder.paymentStatus as any, 'failed')
        ) {
          PaymentStateMachine.transition(
            fullOrder,
            'failed',
            'Payment timeout — stale order cleanup',
          );
          await fullOrder.save();
        }

        Sentry.addBreadcrumb({
          category: 'stale_order_cleanup',
          message: `Stale order ${order._id} cancelled and payment marked as failed`,
          level: 'info',
        });

        cancelledOrders.push(order);
      } catch (err: any) {
        logger.error(`[CRON] Failed to cancel stale order ${order._id}:`, err);
      }
    }

    processed += cancelledOrders.length;
    if (cancelledOrders.length === 0) return;

    logger.info(`[CRON] Stale-order batch cancelled ${cancelledOrders.length} order(s)`);

    try {
      emitAdminNotification({
        type: 'stale_order_cleanup',
        message: `${cancelledOrders.length} stale order(s) cancelled - reservations released`,
        count: cancelledOrders.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Socket may not be initialized.
    }

    for (const order of cancelledOrders) {
      try {
        emitUserEvent(order.user.toString(), 'order_status_update', {
          orderId: order._id.toString(),
          status: 'Cancelled',
          note: STALE_NOTE,
        });
      } catch {
        // Best-effort delivery.
      }
    }
  };

  for await (const doc of cursor) {
    batch.push(doc as StaleOrderRow);
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      batch = [];
    }
  }

  await flushBatch(batch);
  return processed;
};
