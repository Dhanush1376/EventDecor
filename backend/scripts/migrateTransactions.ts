import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDB } from '../src/config/db';
import Order from '../src/models/Order';
import RentalOrder from '../src/models/RentalOrder';
import EventJob from '../src/domains/event_operations/models/EventJob';
import CustomOrder from '../src/models/CustomOrder';
import { TransactionService } from '../src/services/TransactionService';

async function migrateTransactions() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Connected.');

  console.log('Starting Transaction Sync Migration...');

  let totalSynced = 0;
  let totalErrors = 0;

  const mapPaymentStatus = (status?: string) => {
    if (!status) return 'PENDING';
    const l = status.toLowerCase();
    if (['captured', 'paid', 'settled'].includes(l)) return 'COMPLETED';
    if (['failed', 'chargeback', 'disputed'].includes(l)) return 'FAILED';
    if (['refunded'].includes(l)) return 'REFUNDED';
    if (['partially_refunded', 'partial'].includes(l)) return 'PARTIAL';
    return 'PENDING';
  };

  // Sync Purchases
  console.log('\n--- Syncing Purchase Orders ---');
  const orders = await Order.find({ user: { $exists: true } }).lean();
  for (const order of orders) {
    try {
      await TransactionService.syncTransaction(
        'purchase',
        order._id.toString(),
        order.user.toString(),
        order.orderStatus || 'Pending',
        order.total || 0,
        mapPaymentStatus(order.paymentStatus),
        { createdAt: order.createdAt, updatedAt: order.updatedAt },
      );
      totalSynced++;
    } catch (err) {
      console.error(`Failed to sync Order ${order._id}:`, err);
      totalErrors++;
    }
  }

  // Sync Rentals
  console.log('\n--- Syncing Rental Orders ---');
  const rentals = await RentalOrder.find({ user: { $exists: true } }).lean();
  for (const rental of rentals) {
    try {
      await TransactionService.syncTransaction(
        'rental',
        rental._id.toString(),
        rental.user.toString(),
        rental.status || 'pending',
        rental.totalAmount || 0,
        mapPaymentStatus(rental.paymentStatus),
        { createdAt: rental.createdAt, updatedAt: rental.updatedAt },
      );
      totalSynced++;
    } catch (err) {
      console.error(`Failed to sync Rental ${rental._id}:`, err);
      totalErrors++;
    }
  }

  // Sync Events
  console.log('\\n--- Syncing Event Bookings ---');
  const events = await EventJob.find({ user: { $exists: true } }).lean();
  for (const event of events) {
    try {
      await TransactionService.syncTransaction(
        'event',
        event._id.toString(),
        event.user.toString(),
        event.status || 'draft',
        event.pricing?.totalPrice || 0,
        mapPaymentStatus(event.pricing?.paymentStatus),
        { createdAt: event.createdAt, updatedAt: event.updatedAt },
      );
      totalSynced++;
    } catch (err) {
      console.error(`Failed to sync Event ${event._id}:`, err);
      totalErrors++;
    }
  }

  // Sync Custom Orders
  console.log('\n--- Syncing Custom Orders ---');
  const customs = await CustomOrder.find({ customer: { $exists: true } }).lean();
  for (const custom of customs) {
    try {
      await TransactionService.syncTransaction(
        'custom',
        custom._id.toString(),
        custom.customer!.toString(),
        custom.status || 'Pending',
        custom.costEstimation?.total || 0,
        mapPaymentStatus(custom.status),
        { createdAt: custom.createdAt, updatedAt: custom.updatedAt },
      );
      totalSynced++;
    } catch (err) {
      console.error(`Failed to sync Custom Order ${custom._id}:`, err);
      totalErrors++;
    }
  }

  console.log('\nMigration Complete.');
  console.log(`Total Synced: ${totalSynced}`);
  console.log(`Total Errors: ${totalErrors}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrateTransactions().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
