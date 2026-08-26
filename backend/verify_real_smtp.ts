import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { sendEmail } from './src/services/emailProvider';
import Order from './src/models/Order';
import OutboxEvent from './src/models/OutboxEvent';
import { processOutboxEvents } from './src/jobs/outboxProcessor';
import User from './src/models/User';
import logger from './src/config/logger';

dotenv.config({ path: '.env.local' });

async function verifyRealSmtp() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  REAL SMTP DELIVERY & BUSINESS FLOW VERIFICATION');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('[DB] Connected to MongoDB');

  const testEmail = 'dhanush1376@gmail.com';

  console.log('\n──────────────────────────────────────────────────────────────────────');
  console.log('  TEST 1: DIRECT PROVIDER TEST (SMTP)');
  console.log('──────────────────────────────────────────────────────────────────────');

  try {
    const rawResult = await sendEmail({
      to: testEmail,
      subject: 'Test 1: Direct SMTP Provider Connectivity',
      html: '<p>This is a direct provider test proving SMTP works.</p>',
      action: 'direct_smtp_test',
    } as any);
    console.log(`  ✅ Direct SMTP PASS. MessageId: ${rawResult.messageId}`);
  } catch (err: any) {
    console.log(`  ❌ Direct SMTP FAIL. Error: ${err.message}`);
    process.exit(1);
  }

  console.log('\n──────────────────────────────────────────────────────────────────────');
  console.log('  TEST 2: ACTUAL APPLICATION BUSINESS FLOW');
  console.log('──────────────────────────────────────────────────────────────────────');

  // 1. Get or create a customer
  let customer = await User.findOne({ email: testEmail });
  if (!customer) {
    customer = await User.create({
      name: 'Test Customer',
      email: testEmail,
      password: 'password',
      role: 'user',
      isVerified: true,
    } as any);
  }

  // 2. Create a real Order in the database
  const testOrderId = `REAL-FLOW-${Math.floor(Math.random() * 1000000)}`;
  const order = await Order.create({
    user: customer._id,
    orderUuid: testOrderId,
    orderNumber: testOrderId,
    shippingAddress: {
      name: 'Flow Test',
      address: '123 Test',
      locality: 'Flow',
      city: 'Test City',
      state: 'TS',
      pincode: '500001',
      phone: '9999999999',
      email: testEmail,
    },
    items: [
      {
        productId: new mongoose.Types.ObjectId(), // Fake product ID
        title: 'Flow Test Product',
        price: 1500,
        quantity: 1,
        imageSrc: 'https://example.com/image.jpg',
        category: 'Test',
      },
    ],
    subtotal: 1500,
    total: 1500,
    paymentStatus: 'paid',
    orderStatus: 'Pending',
    paymentMethod: 'Razorpay',
  });

  // 3. Create the business OutboxEvent exactly as the Order service would
  const outboxEvent = await OutboxEvent.create({
    aggregateId: order._id.toString(),
    aggregateType: 'Order',
    eventType: 'OrderCreated',
    payload: {
      orderId: order._id.toString(),
      total: 1500,
    },
    status: 'PENDING',
  });
  console.log(`  [FLOW] Created Order ${testOrderId} and OutboxEvent ${outboxEvent._id}`);

  // 4. Force the OutboxProcessor to run
  console.log('  [FLOW] Triggering Outbox Processor...');

  // We need to capture logs from emailProvider or TransactionalEmailService
  // Since we are running in the same process, we can just run the processor and look at stdout.
  await processOutboxEvents();

  console.log('\n  [FLOW] Outbox Processing Complete.');
  console.log('  Please verify the following in the console logs above:');
  console.log(`  1. TransactionalEmailService caught OrderCreated event for ${order._id}`);
  console.log(`  2. [SMTP SUCCESS] logs for ${testEmail} (Customer Order Confirmation)`);
  console.log(`  3. [SMTP SUCCESS] logs for admin order confirmations`);

  // Cleanup
  await Order.findByIdAndDelete(order._id);
  // We don't delete outbox event so we can see it in DB if needed, or delete it
  await OutboxEvent.findByIdAndDelete(outboxEvent._id);

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  REAL DELIVERY TEST SCRIPT COMPLETED');
  console.log('══════════════════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
}

verifyRealSmtp().catch(console.error);
