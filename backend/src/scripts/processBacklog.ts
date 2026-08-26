/**
 * Process all PENDING outbox events (backlog clearance)
 * Run with: npx ts-node src/scripts/processBacklog.ts
 */
import '../config/loadEnv';
import mongoose from 'mongoose';
import OutboxEvent from '../models/OutboxEvent';

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('Connected to MongoDB');

  const pending = await OutboxEvent.find({ status: 'PENDING' }).sort({ createdAt: 1 });
  console.log(`Found ${pending.length} PENDING events`);

  const { processOutboxEventById } = require('../jobs/outboxProcessor');

  let processed = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      await processOutboxEventById(event._id.toString());
      processed++;
      console.log(
        `✅ [${processed}/${pending.length}] ${event.aggregateType}/${event.eventType} (${event._id})`,
      );
    } catch (err: any) {
      failed++;
      console.log(
        `❌ [${processed + failed}/${pending.length}] ${event.aggregateType}/${event.eventType}: ${err.message}`,
      );
    }
  }

  console.log(`\nDone: ${processed} processed, ${failed} failed out of ${pending.length} total`);

  // Show final status distribution
  const statusCounts = await OutboxEvent.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  console.log('\nFinal status distribution:');
  for (const s of statusCounts) {
    console.log(`  ${s._id}: ${s.count}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
