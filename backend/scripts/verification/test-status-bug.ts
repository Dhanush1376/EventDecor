import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });
process.env.LOG_LEVEL = 'info';

import { OrderFulfillmentService } from './src/services/orders/OrderFulfillmentService';
import logger from './src/config/logger';

async function runTest() {
  logger.info('Starting updateOrderStatus test');
  await mongoose.connect(process.env.MONGO_URI as string);

  try {
    const order = await OrderFulfillmentService.updateOrderStatus(
      '6a7033e14fd8a38c3be3c7c0',
      'Confirmed',
      'Test note',
    );
    logger.info('Successfully updated order status!', order._id);
  } catch (error) {
    logger.error('Failed to update order status:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch(console.error);
