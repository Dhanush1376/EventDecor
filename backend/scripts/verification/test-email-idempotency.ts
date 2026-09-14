import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Enable logging
process.env.LOG_LEVEL = 'info';

import { sendDirectEmailProcessor } from './src/services/notificationService';
import NotificationEvent from './src/models/NotificationEvent';
import logger from './src/config/logger';

async function runTest() {
  logger.info('Starting Idempotency End-to-End Test (Direct DB Layer Test)');

  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI as string);

  // Prepare fake outbox event and user details
  const fakeEventId = new mongoose.Types.ObjectId().toString();
  const testCustomerEmail = 'idempotency-test-customer@example.com';

  const notificationKey = `ORDER_CREATED:${fakeEventId}:CUSTOMER:${testCustomerEmail}`;

  logger.info('==============================================');
  logger.info(
    `Step 1: Enqueueing 3 concurrent calls to sendDirectEmailProcessor with identical notificationKey`,
  );
  logger.info(`Key: ${notificationKey}`);
  logger.info('==============================================');

  const options = {
    userId: new mongoose.Types.ObjectId().toString(),
    email: testCustomerEmail,
    type: 'order' as any,
    channel: 'email' as any,
    action: 'order_placed_customer',
    subject: 'Test Order Placed',
    html: '<p>Order Placed</p>',
    notificationKey,
  };

  // Trigger sendDirectEmailProcessor three times concurrently
  const results = await Promise.all([
    sendDirectEmailProcessor(options),
    sendDirectEmailProcessor(options),
    sendDirectEmailProcessor(options),
  ]);

  logger.info(`Concurrent Results (1 should be processed/sent, 2 should be skipped):`);
  results.forEach((res, index) => {
    logger.info(`Call ${index + 1}: ${res?.status || (res as any)?.reason || 'unknown'}`);
  });

  // Let's check DB Idempotency Records
  const dbEvents = await NotificationEvent.find({ notificationKey });
  logger.info(`DB Notification Events Found: ${dbEvents.length} (Should be exactly 1)`);
  for (const event of dbEvents) {
    logger.info(
      `- Key: ${event.notificationKey}, Status: ${event.status}, SentAt: ${event.sentAt}`,
    );
  }

  logger.info('==============================================');
  logger.info(`Step 2: Simulating Replay of the same OutboxEvent (e.g. after queue eviction)...`);
  logger.info('==============================================');

  // Call it again after completion!
  const replayResult = await sendDirectEmailProcessor(options);

  logger.info(
    `Replay Result: ${replayResult?.status || (replayResult as any)?.reason || 'unknown'} (Should be skipped)`,
  );

  logger.info('Cleaning up...');
  await NotificationEvent.deleteMany({ notificationKey });
  await mongoose.disconnect();
  logger.info('Test completed successfully.');
}

runTest().catch((err) => {
  logger.error('Test failed:', err);
  process.exit(1);
});
