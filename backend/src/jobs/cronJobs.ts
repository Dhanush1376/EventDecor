import cron from 'node-cron';
import logger from '../config/logger';
import ContentSection from '../models/ContentSection';
import Order from '../models/Order';
import Product from '../models/Product';

export const initJobs = () => {
  // 1. Cleanup Draft Revisions every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    logger.info('Running weekly CMS revision cleanup...');
    try {
      // Example logic: Remove revisions older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await ContentSection.updateMany(
        {},
        { $pull: { revisionHistory: { modifiedAt: { $lt: thirtyDaysAgo } } } }
      );
      logger.info('CMS revision cleanup completed.');
    } catch (err) {
      logger.error('CMS revision cleanup failed:', err);
    }
  });

  // 2. Release Stock for stale pending orders (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running stale pending orders stock release...');
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const staleOrders = await Order.find({
        paymentStatus: 'pending',
        orderStatus: 'Pending',
        createdAt: { $lt: thirtyMinutesAgo }
      });

      for (const order of staleOrders) {
        // Return stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }
        
        order.paymentStatus = 'failed';
        order.orderStatus = 'Cancelled';
        order.statusHistory.push({ status: 'Cancelled', note: 'Order cancelled due to payment timeout - Stock Released' });
        await order.save();
        logger.info(`Stock released for stale order: ${order._id}`);
      }
    } catch (err) {
      logger.error('Stale orders cleanup failed:', err);
    }
  });

  // 3. Daily Health Heartbeat
  cron.schedule('0 9 * * *', () => {
    logger.info('☀️ Daily server heartbeat: System is healthy.');
  });

  logger.info('⏰ Background jobs initialized');
};
