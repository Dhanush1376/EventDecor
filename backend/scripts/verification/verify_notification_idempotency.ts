import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order';
import User from './src/models/User';
import OutboxEvent from './src/models/OutboxEvent';
import InAppNotification from './src/models/InAppNotification';
import { processOutboxEvents } from './src/jobs/outboxProcessor';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function verifyNotificationIdempotency() {
  console.log('──────────────────────────────────────────────────────────────────────');
  console.log('  NOTIFICATION IDEMPOTENCY VERIFICATION');
  console.log('──────────────────────────────────────────────────────────────────────\n');

  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('[DB] Connected to MongoDB');

    const email = 'dhanush1376@gmail.com';
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email,
        password: 'password',
        role: 'user',
        isVerified: true,
      } as any);
    }

    // 1. Create a fake order
    const orderId = `IDEMP-TEST-${Math.floor(Math.random() * 1000000)}`;
    const order = await Order.create({
      user: user._id,
      orderUuid: orderId,
      status: 'Pending',
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      shippingAddress: {
        name: 'Test User',
        email: 'dhanush1376@gmail.com',
        address: '123 Test St',
        locality: 'Test Locality',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        phone: '1234567890',
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          title: 'Test Product',
          price: 100,
          quantity: 1,
          imageSrc: '/test.jpg',
          category: 'Test',
        },
      ],
      subtotal: 100,
      total: 100,
    } as any);

    console.log(`[SETUP] Created Test Order: ${orderId}`);

    // 2. Create an Outbox Event
    const outboxEvent: any = await OutboxEvent.create({
      eventType: 'OrderCreated',
      aggregateId: order._id,
      aggregateType: 'Order',
      payload: { orderId: order._id },
    } as any);

    console.log(`[SETUP] Created OutboxEvent: ${outboxEvent._id}`);

    // Clean up any existing notifications for this outbox event just in case
    await InAppNotification.deleteMany({ 'metadata.outboxEventId': outboxEvent._id.toString() });

    // 3. Process events (First Run)
    console.log('\n[RUN 1] Processing outbox events...');
    await processOutboxEvents();

    // Check notification count
    let notifs = await InAppNotification.find({
      'metadata.outboxEventId': outboxEvent._id.toString(),
    });
    console.log(`[RESULT 1] Found ${notifs.length} InAppNotifications for this event.`);

    if (notifs.length === 1) {
      console.log('✅ PASS: Exactly 1 notification created on first run.');
    } else {
      console.log('❌ FAIL: Expected 1 notification, got', notifs.length);
    }

    // Reset the OutboxEvent status to trigger a retry scenario
    await OutboxEvent.findByIdAndUpdate(outboxEvent._id, { status: 'PENDING' });

    // 4. Process events (Second Run - Retry)
    console.log('\n[RUN 2] Re-processing outbox events (simulating retry)...');
    await processOutboxEvents();

    notifs = await InAppNotification.find({ 'metadata.outboxEventId': outboxEvent._id.toString() });
    console.log(`[RESULT 2] Found ${notifs.length} InAppNotifications for this event.`);

    if (notifs.length === 1) {
      console.log('✅ PASS: Idempotency confirmed. No duplicate notifications created on retry.');
    } else {
      console.log('❌ FAIL: Expected 1 notification, got', notifs.length);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');
  }
}

verifyNotificationIdempotency();
