import Order from '../models/Order';
import Product from '../models/Product';
import logger from '../config/logger';
import { emitAdminNotification, emitUserEvent } from '../socket';
import type { Types } from 'mongoose';

const BATCH_SIZE = 50;
const STALE_NOTE = 'Order cancelled due to payment timeout — stock released';

type StaleOrderRow = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: Array<{ productId: Types.ObjectId; quantity: number }>;
};

/**
 * Releases stock and cancels pending orders older than 30 minutes.
 * Uses a cursor + bulkWrite to avoid loading all orders into memory.
 */
export const releaseStalePendingOrders = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const filter = {
    $or: [
      {
        paymentStatus: 'pending' as const,
        orderStatus: 'Pending' as const,
        createdAt: { $lt: cutoff },
      },
      {
        paymentStatus: 'processing' as const,
        createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
    ],
  };

  const cursor = Order.find(filter).select('_id items user').lean().cursor();
  let processed = 0;
  let batch: StaleOrderRow[] = [];

  const flushBatch = async (orders: StaleOrderRow[]) => {
    if (orders.length === 0) return;

    const stockOps: Parameters<typeof Product.bulkWrite>[0] = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        if (!item?.productId || !item.quantity) continue;
        stockOps.push({
          updateOne: {
            filter: { _id: item.productId },
            update: { $inc: { stock: item.quantity } },
          },
        });
      }
    }

    if (stockOps.length > 0) {
      await Product.bulkWrite(stockOps, { ordered: false });
    }

    const ids = orders.map((o) => o._id);
    const cancelResult = await Order.updateMany(
      { _id: { $in: ids } },
      {
        $set: { paymentStatus: 'failed', orderStatus: 'Cancelled' },
        $push: {
          statusHistory: {
            status: 'Cancelled',
            timestamp: new Date(),
            note: STALE_NOTE,
          },
        },
      }
    );

    processed += cancelResult.modifiedCount;
    if (cancelResult.modifiedCount > 0) {
      logger.info(`[CRON] Stale-order batch cancelled ${cancelResult.modifiedCount} order(s)`);

      // Notify admin dashboard of stale order cancellations
      try {
        emitAdminNotification({
          type: 'stale_order_cleanup',
          message: `${cancelResult.modifiedCount} stale order(s) cancelled — stock released`,
          count: cancelResult.modifiedCount,
          timestamp: new Date().toISOString(),
        });
      } catch { /* Socket may not be initialized */ }

      // Notify affected customers
      for (const order of orders) {
        try {
          emitUserEvent(order.user.toString(), 'order_status_update', {
            orderId: order._id.toString(),
            status: 'Cancelled',
            note: STALE_NOTE,
          });
        } catch { /* Best-effort delivery */ }
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
