import '../config/loadEnv';
import mongoose from 'mongoose';
import { OrderIdempotencyManager } from '../services/orders/OrderIdempotencyManager';
import { DistributedLock } from '../utils/DistributedLock';
import logger from '../config/logger';

async function runTests() {
  logger.info('--- Starting Enterprise Failure & Resiliency Tests ---');

  // Test 1: Idempotency Duplicate Rejection
  logger.info('\\n[Test 1] Simulating Duplicate Webhook/Payment Requests...');
  const testOrderId = new mongoose.Types.ObjectId().toString();

  // First attempt should succeed
  await OrderIdempotencyManager.acquireLock(testOrderId, 'test_payment_123');
  logger.info('First request registered successfully.');

  try {
    // Second attempt should fail with ApiError 409
    await OrderIdempotencyManager.acquireLock(testOrderId, 'test_payment_123');
    logger.error('Failed! Duplicate request was allowed.');
  } catch (err: any) {
    if (err.statusCode === 409) {
      logger.info('Duplicate request correctly rejected with 409 Conflict.');
    } else {
      logger.error('Failed with unexpected error:', err);
    }
  }

  // Test 2: Distributed Lock Contention
  logger.info('\\n[Test 2] Simulating Distributed Lock Race Conditions...');
  const resourceKey = 'test_venue_2026-10-10';

  const lock1 = await DistributedLock.acquireLock(resourceKey, 10);
  if (lock1) {
    logger.info('First lock acquired successfully.');
  }

  const lock2 = await DistributedLock.acquireLock(resourceKey, 10);
  if (!lock2) {
    logger.info('Second lock attempt correctly rejected (Race Condition Prevented).');
  } else {
    logger.error('Failed! Second lock was acquired concurrently.');
  }

  if (lock1) {
    await DistributedLock.releaseLock(resourceKey, lock1);
    logger.info('Lock released safely.');
  }

  logger.info('\\n--- Enterprise Failure Tests Completed ---');
  process.exit(0);
}

runTests().catch((err) => {
  logger.error('Fatal Test Error:', err);
  process.exit(1);
});
