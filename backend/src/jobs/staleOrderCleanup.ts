import Order from '../models/Order';
import Product from '../models/Product';
import logger from '../config/logger';
import type { Types } from 'mongoose';

const BATCH_SIZE = 50;
const STALE_NOTE = 'Order cancelled due to payment timeout — stock released';

type StaleOrderRow = {
  _id: Types.ObjectId;
  items: Array<{ productId: Types.ObjectId; quantity: number }>;
};

/**
 * Releases stock and cancels pending orders older than 30 minutes.
 * Uses a cursor + bulkWrite to avoid loading all orders into memory.
 */
export const releaseStalePendingOrders = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const filter = {
    paymentStatus: 'pending' as const,
    orderStatus: 'Pending' as const,
    createdAt: { $lt: cutoff },
  };

  const cursor = Order.find(filter).select('_id items').lean().cursor();
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
