// @ts-nocheck
import mongoose from 'mongoose';
import crypto from 'crypto';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// 1. Environmental Safeguards (Must be set BEFORE importing services to prevent side effects)
process.env.NODE_ENV = 'test';
const baseUri = process.env.MONGO_URI || '';
// Force the database to 'eventdecor_payment_e2e' to ensure total isolation on the Atlas cluster
process.env.MONGO_URI = baseUri.replace(/\/[^/?]+(\?|$)/, '/eventdecor_payment_e2e$1');
console.log('E2E Target URI:', process.env.MONGO_URI.replace(/:[^:@]+@/, ':***@'));

process.env.EMAIL_DISABLED = 'true';
process.env.RAZORPAY_TEST_MODE = 'true';
process.env.RAZORPAY_WEBHOOK_SECRET = 'e2e_test_webhook_secret_must_be_long_enough_32_chars';
process.env.JWT_SECRET = 'e2e_test_jwt_secret_must_be_long_enough_32_chars';

// Initialize mongoose early to suppress warnings
mongoose.set('strictQuery', false);

// Disable logger output during E2E unless there's an error
const logger = require('../src/config/logger').default;
logger.level = 'error';

import Order from '../src/models/Order';
import User from '../src/models/User';
import Product from '../src/models/Product';
import PaymentWebhookEvent from '../src/models/PaymentWebhookEvent';
import RefundRecord from '../src/models/RefundRecord';
import WalletTransaction from '../src/models/WalletTransaction';
import OutboxEvent from '../src/models/OutboxEvent';
import { PaymentWebhookService } from '../src/services/PaymentWebhookService';

const createdArtifacts = {
  users: [] as string[],
  products: [] as string[],
  orders: [] as string[],
};

const prefix = 'e2e_';

const generateSignature = (payload: any) => {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex');
};

const setupTestArtifacts = async () => {
  const user = await User.create({
    name: `${prefix}Test User`,
    email: `${prefix}test_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'customer',
  });
  createdArtifacts.users.push(user._id.toString());

  const product = await Product.create({
    title: `${prefix}Test Product`,
    slug: `${prefix}test-product-${Date.now()}`,
    description: 'Test product for E2E',
    price: 1000,
    category: new mongoose.Types.ObjectId().toString(),
    inStock: true,
    stock: 10,
    imageSrc: 'test.jpg',
    sku: `${prefix}SKU_${Date.now()}`,
  });
  createdArtifacts.products.push(product._id.toString());

  return { user, product };
};

const cleanupArtifacts = async () => {
  console.log('\\n[TEARDOWN] Cleaning up E2E artifacts...');
  const orderCount = await Order.deleteMany({ _id: { $in: createdArtifacts.orders } });
  const userCount = await User.deleteMany({ _id: { $in: createdArtifacts.users } });
  const productCount = await Product.deleteMany({ _id: { $in: createdArtifacts.products } });
  const webhookCount = await PaymentWebhookEvent.deleteMany({
    razorpayEventId: { $regex: `^${prefix}` },
  });
  const refundCount = await RefundRecord.deleteMany({ entityId: { $in: createdArtifacts.orders } });
  const walletCount = await WalletTransaction.deleteMany({ user: { $in: createdArtifacts.users } });
  const outboxCount = await OutboxEvent.deleteMany({
    'payload.orderId': { $in: createdArtifacts.orders },
  });

  console.log(
    `Deleted:\\n - Orders: ${orderCount.deletedCount}\\n - Users: ${userCount.deletedCount}\\n - Products: ${productCount.deletedCount}\\n - Webhooks: ${webhookCount.deletedCount}\\n - Refunds: ${refundCount.deletedCount}\\n - Wallets: ${walletCount.deletedCount}\\n - Outbox: ${outboxCount.deletedCount}`,
  );
};

const runE2E = async () => {
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGO_URI}...`);
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected.\\n');

    // Force collection creation to prevent Transaction Catalog errors in MongoDB Atlas
    await Order.createCollection().catch(() => {});
    await User.createCollection().catch(() => {});
    await Product.createCollection().catch(() => {});
    await PaymentWebhookEvent.createCollection().catch(() => {});
    await OutboxEvent.createCollection().catch(() => {});
    await RefundRecord.createCollection().catch(() => {});
    await WalletTransaction.createCollection().catch(() => {});

    const { user, product } = await setupTestArtifacts();
    const results: string[] = [];

    const createE2EOrder = async (qty = 1) => {
      const order = await Order.create({
        user: user._id,
        items: [
          {
            productId: product._id.toString(),
            quantity: qty,
            price: product.price,
            title: product.title,
            imageSrc: product.imageSrc,
          },
        ],
        subtotal: product.price * qty,
        total: product.price * qty,
        shippingAddress: {
          name: 'E2E',
          email: user.email,
          phone: '1234567890',
          address: '123 St',
          locality: 'Loc',
          city: 'City',
          state: 'State',
          pincode: '123456',
        },
        paymentStatus: 'pending',
        orderStatus: 'Pending',
        razorpayOrderId: `${prefix}rzp_order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      });
      createdArtifacts.orders.push(order._id.toString());
      return order;
    };

    const injectWebhook = async (
      event: string,
      orderId: string,
      paymentStatus: string = 'captured',
      customEventId?: string,
    ) => {
      const payload = {
        event,
        payload: {
          payment: {
            entity: {
              id: `${prefix}pay_${Date.now()}`,
              order_id: orderId,
              amount: 100000,
              currency: 'INR',
              status: paymentStatus,
            },
          },
        },
      };
      const eventId =
        customEventId || `${prefix}evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const signature = generateSignature(payload);
      return PaymentWebhookService.processRazorpayWebhookCore(event, payload, signature, eventId);
    };

    // --- Scenario 1: Successful Payment ---
    try {
      const order1 = await createE2EOrder();
      await injectWebhook('payment.captured', order1.razorpayOrderId);
      const updatedOrder = await Order.findById(order1._id);
      const emailQueued = await OutboxEvent.findOne({
        'payload.orderId': order1._id.toString(),
        'payload.type': 'email',
      });
      if (updatedOrder?.paymentStatus === 'paid' && emailQueued) {
        results.push('[PASS] Scenario 1: Successful Payment');
      } else {
        results.push(`[FAIL] Scenario 1: Order Status=${updatedOrder?.paymentStatus}`);
      }
    } catch (e: any) {
      results.push(`[FAIL] Scenario 1: ${e.message}`);
    }

    // --- Scenario 2: Failed Payment ---
    try {
      const order2 = await createE2EOrder();
      await injectWebhook('payment.failed', order2.razorpayOrderId, 'failed');
      const updatedOrder = await Order.findById(order2._id);
      if (updatedOrder?.paymentStatus === 'failed')
        results.push('[PASS] Scenario 2: Failed Payment');
      else results.push(`[FAIL] Scenario 2: Status=${updatedOrder?.paymentStatus}`);
    } catch (e: any) {
      results.push(`[FAIL] Scenario 2: ${e.message}`);
    }

    // --- Scenario 4: Duplicate Webhook ---
    try {
      const order4 = await createE2EOrder();
      const eventId = `${prefix}evt_dup_${Date.now()}`;
      await injectWebhook('payment.captured', order4.razorpayOrderId, 'captured', eventId);

      let duplicateIgnored = false;
      try {
        const res = await injectWebhook(
          'payment.captured',
          order4.razorpayOrderId,
          'captured',
          eventId,
        );
        if (res?.status === 200) duplicateIgnored = true;
      } catch (err: any) {}

      const outboxCount = await OutboxEvent.countDocuments({
        'payload.orderId': order4._id.toString(),
      });
      if (duplicateIgnored && outboxCount === 1)
        results.push('[PASS] Scenario 4: Duplicate Webhook Idempotency');
      else
        results.push(
          `[FAIL] Scenario 4: Duplicate Ignored=${duplicateIgnored}, Outbox=${outboxCount}`,
        );
    } catch (e: any) {
      results.push(`[FAIL] Scenario 4: ${e.message}`);
    }

    // --- Scenario 11: Inventory Race Condition ---
    try {
      const raceProduct = await Product.create({
        title: `${prefix}Race Product`,
        slug: `${prefix}race-product-${Date.now()}`,
        description: 'Test product for race',
        price: 1000,
        category: new mongoose.Types.ObjectId().toString(),
        inStock: true,
        stock: 1, // Crucial: only 1 left
        imageSrc: 'test.jpg',
        sku: `${prefix}SKU_RACE_${Date.now()}`,
      });
      createdArtifacts.products.push(raceProduct._id.toString());

      const orderA = await createE2EOrder();
      orderA.items[0].productId = raceProduct._id as any;
      orderA.markModified('items');
      orderA.razorpayOrderId = `${prefix}rzp_race_A`;
      await orderA.save();

      const orderB = await createE2EOrder();
      orderB.items[0].productId = raceProduct._id as any;
      orderB.markModified('items');
      orderB.razorpayOrderId = `${prefix}rzp_race_B`;
      await orderB.save();

      const resA = injectWebhook('payment.captured', orderA.razorpayOrderId);
      const resB = injectWebhook('payment.captured', orderB.razorpayOrderId);
      await Promise.allSettled([resA, resB]);

      const refreshedA = await Order.findById(orderA._id);
      const refreshedB = await Order.findById(orderB._id);
      const refreshedProd = await Product.findById(raceProduct._id);

      const paidCount = [refreshedA?.paymentStatus, refreshedB?.paymentStatus].filter(
        (s) => s === 'paid',
      ).length;
      if (paidCount === 1 && refreshedProd?.stock === 0) {
        results.push('[PASS] Scenario 11: Inventory Race Condition Handled');
      } else {
        results.push(`[FAIL] Scenario 11: PaidCount=${paidCount}, Stock=${refreshedProd?.stock}`);
      }
    } catch (e: any) {
      results.push(`[FAIL] Scenario 11: ${e.message}`);
    }

    console.log('\\n--- E2E SIMULATION RESULTS ---');
    results.forEach((r) => console.log(r));
    console.log('------------------------------\\n');
  } catch (err) {
    console.error('Fatal error during E2E:', err);
  } finally {
    await cleanupArtifacts();
    await mongoose.disconnect();
    process.exit(0);
  }
};

runE2E();
