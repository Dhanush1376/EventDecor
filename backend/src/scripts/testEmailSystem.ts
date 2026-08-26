/**
 * EMAIL SYSTEM DIAGNOSTIC SCRIPT
 *
 * This script verifies the entire email pipeline by:
 * 1. Connecting to the actual MongoDB database
 * 2. Checking OutboxEvent status distribution
 * 3. Checking AdminNotification records
 * 4. Testing the email provider directly (Brevo or SMTP)
 * 5. Testing sendDirectEmailProcessor directly
 *
 * Run with: npx ts-node src/scripts/testEmailSystem.ts
 */

import '../config/loadEnv';
import mongoose from 'mongoose';
import OutboxEvent from '../models/OutboxEvent';
import AdminNotification from '../models/AdminNotification';
import NotificationLog from '../models/NotificationLog';

async function run() {
  console.log('\n========================================');
  console.log('EMAIL SYSTEM DIAGNOSTIC');
  console.log('========================================\n');

  // 1. Environment Check
  console.log('[1] ENVIRONMENT VARIABLES');
  console.log(`  NODE_ENV:        ${process.env.NODE_ENV}`);
  console.log(
    `  BREVO_API_KEY:   ${process.env.BREVO_API_KEY ? 'SET (' + process.env.BREVO_API_KEY.substring(0, 8) + '...)' : 'NOT SET'}`,
  );
  console.log(`  SMTP_USER:       ${process.env.SMTP_USER || 'NOT SET'}`);
  console.log(`  SMTP_PASS:       ${process.env.SMTP_PASS ? 'SET (redacted)' : 'NOT SET'}`);
  console.log(`  SMTP_HOST:       ${process.env.SMTP_HOST || 'NOT SET'}`);
  console.log(`  SMTP_PORT:       ${process.env.SMTP_PORT || 'NOT SET'}`);
  console.log(`  ENABLE_CRON:     ${process.env.ENABLE_CRON}`);
  console.log(`  ENABLE_WORKERS:  ${process.env.ENABLE_WORKERS}`);
  console.log(`  REQUIRE_REDIS:   ${process.env.REQUIRE_REDIS}`);
  console.log(`  REDIS_URL:       ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`);
  console.log('');

  // 2. Connect to MongoDB
  console.log('[2] CONNECTING TO MONGODB...');
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('  ✅ Connected\n');

  // 3. Check OutboxEvent status distribution
  console.log('[3] OUTBOX EVENT STATUS DISTRIBUTION');
  const statusCounts = await OutboxEvent.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  for (const s of statusCounts) {
    console.log(`  ${s._id}: ${s.count}`);
  }

  // Show recent PENDING events
  const pendingEvents = await OutboxEvent.find({ status: 'PENDING' })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  if (pendingEvents.length > 0) {
    console.log(`\n  ⚠️  ${pendingEvents.length} most recent PENDING events:`);
    for (const e of pendingEvents) {
      console.log(
        `    - ${(e as any).aggregateType}/${(e as any).eventType} (${(e as any)._id}) created ${(e as any).createdAt}`,
      );
    }
  }
  console.log('');

  // 4. Check AdminNotification records
  console.log('[4] ADMIN NOTIFICATIONS (last 5)');
  const recentNotifs = await AdminNotification.find().sort({ createdAt: -1 }).limit(5).lean();
  if (recentNotifs.length === 0) {
    console.log('  ❌ No admin notifications found');
  } else {
    for (const n of recentNotifs) {
      console.log(
        `  - [${(n as any).type}] ${(n as any).title}: ${(n as any).message} (${(n as any).createdAt})`,
      );
    }
  }
  console.log('');

  // 5. Check NotificationLog (email delivery logs)
  console.log('[5] NOTIFICATION LOGS (last 5 email deliveries)');
  const recentLogs = await NotificationLog.find().sort({ createdAt: -1 }).limit(5).lean();
  if (recentLogs.length === 0) {
    console.log('  ❌ No notification logs found');
  } else {
    for (const l of recentLogs) {
      console.log(
        `  - [${(l as any).status}] ${(l as any).action} → ${(l as any).recipient} (${(l as any).createdAt})`,
      );
    }
  }
  console.log('');

  // 6. Test email provider directly
  console.log('[6] TESTING EMAIL PROVIDER DIRECTLY');
  const testRecipient = process.env.SMTP_USER || 'dhanush1376@gmail.com';
  try {
    const { sendEmail } = require('../services/emailProvider');
    const result = await sendEmail({
      to: testRecipient,
      subject: '[TEST] EventDecor Email System Diagnostic',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">🔧 Email System Test</h2>
          <p>This is a diagnostic email sent by the EventDecor email system test script.</p>
          <p>If you receive this, the email provider is working correctly.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });
    console.log(`  ✅ Email accepted by provider!`);
    console.log(`  Provider MessageId: ${result.messageId}`);
    console.log(`  Recipient: ${testRecipient}`);
  } catch (err: any) {
    console.log(`  ❌ Email provider FAILED: ${err.message}`);
  }
  console.log('');

  // 7. Now test the FULL pipeline by processing a pending outbox event
  if (pendingEvents.length > 0) {
    console.log('[7] TESTING INLINE OUTBOX PROCESSING');
    const testEvent = pendingEvents[0];
    console.log(
      `  Processing: ${(testEvent as any).aggregateType}/${(testEvent as any).eventType} (${(testEvent as any)._id})`,
    );
    try {
      const { processOutboxEventById } = require('../jobs/outboxProcessor');
      await processOutboxEventById((testEvent as any)._id.toString());

      // Check the event status after processing
      const updated = await OutboxEvent.findById((testEvent as any)._id).lean();
      console.log(`  Status after processing: ${(updated as any)?.status}`);
      if ((updated as any)?.status === 'PUBLISHED') {
        console.log(`  ✅ Outbox event processed successfully!`);
      } else {
        console.log(`  ⚠️  Event status is ${(updated as any)?.status}`);
      }
    } catch (err: any) {
      console.log(`  ❌ Outbox processing FAILED: ${err.message}`);
    }
  } else {
    console.log('[7] No pending outbox events to test inline processing');
  }
  console.log('');

  console.log('========================================');
  console.log('DIAGNOSTIC COMPLETE');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('DIAGNOSTIC FAILED:', err);
  process.exit(1);
});
