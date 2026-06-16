import mongoose from 'mongoose';
import '../src/config/loadEnv';
import logger from '../src/config/logger';

// Import all models to ensure schemas are registered and indexes are created
import Order from '../src/models/Order';
import PaymentWebhookEvent from '../src/models/PaymentWebhookEvent';
import Product from '../src/models/Product';
import InventoryReservation from '../src/models/InventoryReservation';
import RefundRecord from '../src/models/RefundRecord';

async function runIndexBuild() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventdecor';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB for index building.');

    logger.info('Building indexes for Order...');
    await Order.syncIndexes();

    logger.info('Building indexes for PaymentWebhookEvent...');
    await PaymentWebhookEvent.syncIndexes();

    logger.info('Building indexes for Product...');
    await Product.syncIndexes();

    logger.info('Building indexes for InventoryReservation...');
    await InventoryReservation.syncIndexes();

    logger.info('Building indexes for RefundRecord...');
    await RefundRecord.syncIndexes();

    logger.info('✅ All indexes successfully synchronized!');
  } catch (error) {
    logger.error('Failed to build indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runIndexBuild();
