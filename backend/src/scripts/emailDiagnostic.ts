/**
 * EMAIL PIPELINE DIAGNOSTIC SCRIPT
 *
 * Usage: npx ts-node src/scripts/emailDiagnostic.ts
 *
 * This script:
 * 1. Connects to the database
 * 2. Submits a test inquiry (bypassing HTTP/CSRF)
 * 3. Waits for processing
 * 4. Checks NotificationEvent records
 * 5. Sends a direct OTP-style test email for comparison
 * 6. Reports results
 */

import '../config/loadEnv';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import { TransactionalEmailService } from '../services/TransactionalEmailService';

const TRACE_MARKER = `EMAIL-TRACE-${Date.now()}`;

async function main() {
  console.log('='.repeat(60));
  console.log('EMAIL PIPELINE DIAGNOSTIC');
  console.log(`Trace marker: ${TRACE_MARKER}`);
  console.log('='.repeat(60));

  // 1. Connect to DB
  await connectDB();
  console.log('[STEP 1] Database connected');

  // 2. Initialize queues and workers (same as server startup)
  const { initQueues, isQueuesReady, usingFallback, connection } = require('../jobs/queues');
  const { initWorkers } = require('../jobs/workers');

  await initQueues();
  await initWorkers();

  const queueReady = isQueuesReady();
  console.log(
    `[STEP 2] Queue status: ready=${queueReady} usingFallback=${usingFallback} redisStatus=${connection.status}`,
  );

  // 3. Create a test inquiry directly in DB
  const Inquiry = require('../models/Inquiry').default;
  const inquiry = await Inquiry.create({
    name: 'Email Diagnostic Test',
    email: process.env.DIAGNOSTIC_TEST_EMAIL || process.env.ADMIN_EMAIL || 'test@example.com',
    subject: `Diagnostic Test ${TRACE_MARKER}`,
    message: `This is an automated diagnostic test to trace the transactional email pipeline. Marker: ${TRACE_MARKER}`,
    phone: '',
  });
  console.log(`[STEP 3] Inquiry created id=${inquiry._id}`);

  // 4. Call TransactionalEmailService.sendInquiryEmails() directly
  // TransactionalEmailService is statically imported at the top
  console.log(`[STEP 4] Calling TransactionalEmailService.sendInquiryEmails...`);

  try {
    await TransactionalEmailService.sendInquiryEmails(inquiry, inquiry._id.toString());
    console.log(`[STEP 4] sendInquiryEmails completed (no exception thrown)`);
  } catch (err: any) {
    console.error(`[STEP 4] sendInquiryEmails THREW: ${err.message}`);
  }

  // 5. Wait for worker processing (if using BullMQ)
  console.log(`[STEP 5] Waiting 10 seconds for worker processing...`);
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // 6. Check NotificationEvent records
  const NotificationEvent = require('../models/NotificationEvent').default;
  const events = await NotificationEvent.find({
    notificationKey: { $regex: inquiry._id.toString() },
  }).lean();

  console.log(`\n[STEP 6] NotificationEvent records found: ${events.length}`);
  for (const evt of events) {
    console.log(`  key=${evt.notificationKey}`);
    console.log(`  status=${evt.status}`);
    console.log(`  providerMessageId=${evt.providerMessageId || 'NONE'}`);
    console.log(`  errorLog=${evt.errorLog || 'NONE'}`);
    console.log(`  createdAt=${evt.createdAt}`);
    console.log(`  updatedAt=${evt.updatedAt}`);
    console.log(`  ---`);
  }

  // 7. Check NotificationLog records
  const NotificationLog = require('../models/NotificationLog').default;
  const logs = await NotificationLog.find({
    action: { $in: ['inquiry_customer', 'inquiry_admin'] },
    createdAt: { $gte: new Date(Date.now() - 60000) },
  }).lean();

  console.log(`\n[STEP 7] NotificationLog records (last 60s): ${logs.length}`);
  for (const log of logs) {
    console.log(`  action=${log.action} status=${log.status} messageId=${log.messageId || 'NONE'}`);
    console.log(`  errorDetails=${log.errorDetails || 'NONE'}`);
    console.log(`  ---`);
  }

  // 8. Now test OTP-style direct email (for comparison)
  console.log(`\n[STEP 8] Sending OTP-style comparison email via sendDirectEmail...`);
  const { sendDirectEmail } = require('../services/notificationService');
  const { getOtpEmailTemplate } = require('../utils/email/emailTemplates');

  const testRecipient =
    process.env.DIAGNOSTIC_TEST_EMAIL || process.env.ADMIN_EMAIL || 'test@example.com';

  sendDirectEmail({
    email: testRecipient,
    subject: `OTP-Style Diagnostic Test ${TRACE_MARKER}`,
    customHtml: getOtpEmailTemplate('123456', 10),
    type: 'security' as any,
    action: 'diagnostic_otp_test',
  });

  // Wait for OTP processing
  console.log(`[STEP 8] Waiting 10 seconds for OTP-style email processing...`);
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // 9. Check OTP-style notification log
  const otpLogs = await NotificationLog.find({
    action: 'diagnostic_otp_test',
    createdAt: { $gte: new Date(Date.now() - 60000) },
  }).lean();

  console.log(`\n[STEP 9] OTP-style diagnostic log records: ${otpLogs.length}`);
  for (const log of otpLogs) {
    console.log(`  action=${log.action} status=${log.status}`);
    console.log(`  errorDetails=${log.errorDetails || 'NONE'}`);
    console.log(`  ---`);
  }

  // 10. Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Queue: ready=${queueReady} fallback=${usingFallback} redis=${connection.status}`);
  console.log(`Inquiry events: ${events.length}`);
  for (const evt of events) {
    console.log(
      `  ${evt.notificationKey} -> ${evt.status} (messageId: ${evt.providerMessageId || 'NONE'})`,
    );
  }
  console.log(`Inquiry logs: ${logs.length}`);
  for (const log of logs) {
    console.log(`  ${log.action} -> ${log.status}`);
  }
  console.log(`OTP-style logs: ${otpLogs.length}`);
  for (const log of otpLogs) {
    console.log(`  ${log.action} -> ${log.status}`);
  }

  // Cleanup
  await mongoose.connection.close();
  console.log('\nDone. Check console output above for trace logs.');
  process.exit(0);
}

main().catch((err) => {
  console.error('DIAGNOSTIC FAILED:', err);
  process.exit(1);
});
