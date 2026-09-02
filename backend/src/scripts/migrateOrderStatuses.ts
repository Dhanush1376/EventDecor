import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order'; // Assuming this is exported or we can just import the connection

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventdecor';

const statusMapping: Record<string, string> = {
  'Payment Pending': 'Pending',
  Packed: 'Processing',
  'Ready to Ship': 'Processing',
  Shipped: 'Processing',
  'Out for Delivery': 'Processing',
  placed: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  settled: 'Settled',
};

async function migrateOrders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const orders = await Order.find({});
    console.log(`Found ${orders.length} total orders`);

    let updatedCount = 0;

    for (const order of orders) {
      let isModified = false;

      // 1. Migrate primary orderStatus
      const currentStatus = order.orderStatus as string;
      if (statusMapping[currentStatus]) {
        order.orderStatus = statusMapping[currentStatus] as any;
        isModified = true;
      }

      // 2. Migrate statusHistory array
      if (order.statusHistory && order.statusHistory.length > 0) {
        order.statusHistory.forEach((historyItem: any) => {
          if (statusMapping[historyItem.status]) {
            historyItem.status = statusMapping[historyItem.status];
            isModified = true;
          }
        });
      }

      if (isModified) {
        await order.save();
        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} orders to new canonical statuses.`);

    // Verification step
    const oldStatuses = [
      'Payment Pending',
      'Packed',
      'Ready to Ship',
      'Shipped',
      'Out for Delivery',
    ];
    const remainingOld = await Order.countDocuments({ orderStatus: { $in: oldStatuses } } as any);
    console.log(`Verification: Found ${remainingOld} orders with old statuses.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateOrders();
