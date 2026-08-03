import '../config/loadEnv';
import mongoose from 'mongoose';
import connectDB from '../config/db';

async function main() {
  await connectDB();

  const NE = require('../models/NotificationEvent').default;
  const inquiryId = process.argv[2] || '6a708c05363ae31db61b6c22';

  const events = await NE.find({
    notificationKey: { $regex: inquiryId },
  }).lean();

  console.log(`\nNotificationEvent records for inquiry ${inquiryId}: ${events.length}`);
  for (const evt of events) {
    console.log(`  key=${evt.notificationKey}`);
    console.log(`  status=${evt.status}`);
    console.log(`  providerMessageId=${evt.providerMessageId || 'NONE'}`);
    console.log(`  errorLog=${evt.errorLog || 'NONE'}`);
    console.log(`  createdAt=${evt.createdAt}`);
    console.log(`  updatedAt=${evt.updatedAt}`);
    console.log(`  ---`);
  }

  // Also check from previous diagnostic run
  const prevEvents = await NE.find({
    notificationKey: { $regex: '6a708b60e850b29f5a1a1887' },
  }).lean();

  console.log(`\nPrevious diagnostic NotificationEvent records: ${prevEvents.length}`);
  for (const evt of prevEvents) {
    console.log(`  key=${evt.notificationKey}`);
    console.log(`  status=${evt.status}`);
    console.log(`  providerMessageId=${evt.providerMessageId || 'NONE'}`);
    console.log(`  errorLog=${evt.errorLog || 'NONE'}`);
    console.log(`  ---`);
  }

  const NL = require('../models/NotificationLog').default;
  const logs = await NL.find({
    action: { $in: ['inquiry_customer', 'inquiry_admin'] },
    createdAt: { $gte: new Date(Date.now() - 300000) },
  })
    .select('action status errorDetails')
    .lean();

  console.log(`\nNotificationLog records (last 5min): ${logs.length}`);
  for (const log of logs) {
    console.log(`  action=${log.action} status=${log.status} error=${log.errorDetails || 'NONE'}`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
