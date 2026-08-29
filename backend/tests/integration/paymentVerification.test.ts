import './setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';

import { PaymentVerificationService } from '../../src/services/PaymentVerificationService';
import { TransactionalEmailService } from '../../src/services/TransactionalEmailService';
import { RazorpayGateway } from '../../src/utils/payment/RazorpayGateway';
import User from '../../src/models/User';
import Product from '../../src/models/Product';
import Category from '../../src/models/Category';
import PaymentAttempt from '../../src/models/PaymentAttempt';
import Order from '../../src/models/Order';
import PaymentAudit from '../../src/models/PaymentAudit';

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

const signOrderPayment = (orderId: string, paymentId: string): string =>
  crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

/** Seed a verified customer + a product and return their ids. */
const seedUserAndProduct = async () => {
  const category = await Category.create({ name: 'Decor', slug: `decor-${Date.now()}` } as any);
  const user = await User.create({
    name: 'Test Buyer',
    email: `buyer_${Date.now()}@example.com`,
    password: 'hashed_placeholder_value',
    isVerified: true,
    walletBalance: 0,
  } as any);
  const product = await Product.create({
    title: 'Fairy Lights',
    slug: `fairy-lights-${Date.now()}`,
    primaryCategory: category._id,
    price: 500,
    imageSrc: 'https://example.com/img.webp',
    description: 'Warm white string lights',
    stock: 100,
  } as any);
  return { user, product };
};

/**
 * Build a `PaymentAttempt` in `initiated` state that mirrors what the checkout
 * service persists before the client returns from Razorpay. `total` is in
 * rupees; the gateway amount is validated in paise.
 */
const seedPaymentAttempt = async (opts: {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  total: number;
  razorpayOrderId: string;
}) => {
  const pendingOrderId = new mongoose.Types.ObjectId();
  return PaymentAttempt.create({
    razorpayOrderId: opts.razorpayOrderId,
    userId: opts.userId,
    type: 'purchase',
    status: 'initiated',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    orderData: {
      pendingOrderId,
      orderItems: [
        {
          productId: opts.productId,
          title: 'Fairy Lights',
          price: opts.total,
          quantity: 1,
          imageSrc: 'https://example.com/img.webp',
        },
      ],
      shippingAddress: {
        name: 'Test Buyer',
        phone: '9876543210',
        email: 'buyer@example.com',
        pincode: '560001',
        locality: 'Indiranagar',
        address: '12 Main Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
      },
      subtotal: opts.total,
      shippingFee: 0,
      discount: 0,
      codFee: 0,
      walletDeduction: 0,
      total: opts.total,
      paymentMethod: 'Razorpay',
      reservationIds: [],
      invoiceNumber: `INV-${Date.now()}`,
    },
  } as any);
};

/** Mock the gateway fetch so no real Razorpay call is made. */
const mockGatewayPayment = (overrides: Record<string, any> = {}) => {
  vi.spyOn(RazorpayGateway, 'getPayment').mockResolvedValue({
    id: 'pay_TEST',
    amount: 50000,
    currency: 'INR',
    status: 'captured',
    order_id: 'order_TEST',
    ...overrides,
  } as any);
};

describe('PaymentVerificationService.verifyPayment (integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TransactionalEmailService, 'sendPaymentFailedEmail').mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a paid order when signature, amount, currency, order and status all match', async () => {
    const { user, product } = await seedUserAndProduct();
    const razorpayOrderId = 'order_TEST';
    const paymentId = 'pay_TEST';
    await seedPaymentAttempt({
      userId: user._id,
      productId: product._id,
      total: 500,
      razorpayOrderId,
    });
    mockGatewayPayment({ amount: 50000, order_id: razorpayOrderId });

    const order = await PaymentVerificationService.verifyPayment(
      {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signOrderPayment(razorpayOrderId, paymentId),
      },
      user._id.toString(),
      'user',
      'frontend',
    );

    expect(order).toBeTruthy();
    expect(order.paymentStatus).toBe('paid');

    const attempt = await PaymentAttempt.findOne({ razorpayOrderId });
    expect(attempt?.status).toBe('success');

    const persisted = await Order.findById(order._id);
    expect(persisted).toBeTruthy();
    expect(persisted!.total).toBe(500);
  });

  it('rejects a forged signature and does NOT create an order', async () => {
    const { user, product } = await seedUserAndProduct();
    const razorpayOrderId = 'order_TEST';
    await seedPaymentAttempt({
      userId: user._id,
      productId: product._id,
      total: 500,
      razorpayOrderId,
    });
    mockGatewayPayment({ amount: 50000, order_id: razorpayOrderId });

    await expect(
      PaymentVerificationService.verifyPayment(
        {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: 'pay_TEST',
          razorpay_signature: 'deadbeef'.repeat(8), // wrong signature
        },
        user._id.toString(),
        'user',
        'frontend',
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    const orders = await Order.find({});
    expect(orders).toHaveLength(0);
    const attempt = await PaymentAttempt.findOne({ razorpayOrderId });
    expect(attempt?.status).toBe('failed');
    // A tamper audit trail must exist
    const audits = await PaymentAudit.find({ razorpayOrderId });
    expect(audits.length).toBeGreaterThan(0);
  });

  it('rejects when the gateway-reported amount is less than expected (amount tampering)', async () => {
    const { user, product } = await seedUserAndProduct();
    const razorpayOrderId = 'order_TEST';
    const paymentId = 'pay_TEST';
    await seedPaymentAttempt({
      userId: user._id,
      productId: product._id,
      total: 500,
      razorpayOrderId,
    });
    // Buyer paid only ₹1 (100 paise) but the order is ₹500.
    mockGatewayPayment({ amount: 100, order_id: razorpayOrderId });

    await expect(
      PaymentVerificationService.verifyPayment(
        {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signOrderPayment(razorpayOrderId, paymentId),
        },
        user._id.toString(),
        'user',
        'frontend',
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(await Order.find({})).toHaveLength(0);
  });

  it('is idempotent: a second verification returns the same order, not a duplicate', async () => {
    const { user, product } = await seedUserAndProduct();
    const razorpayOrderId = 'order_TEST';
    const paymentId = 'pay_TEST';
    await seedPaymentAttempt({
      userId: user._id,
      productId: product._id,
      total: 500,
      razorpayOrderId,
    });
    mockGatewayPayment({ amount: 50000, order_id: razorpayOrderId });

    const payload = {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signOrderPayment(razorpayOrderId, paymentId),
    };

    const first = await PaymentVerificationService.verifyPayment(
      payload,
      user._id.toString(),
      'user',
      'frontend',
    );
    const second = await PaymentVerificationService.verifyPayment(
      payload,
      user._id.toString(),
      'user',
      'frontend',
    );

    expect(String(second._id)).toBe(String(first._id));
    expect(await Order.countDocuments({})).toBe(1);
  });

  it('forbids a user from verifying a payment attempt that belongs to someone else', async () => {
    const { user, product } = await seedUserAndProduct();
    const razorpayOrderId = 'order_TEST';
    const paymentId = 'pay_TEST';
    await seedPaymentAttempt({
      userId: user._id,
      productId: product._id,
      total: 500,
      razorpayOrderId,
    });
    mockGatewayPayment({ amount: 50000, order_id: razorpayOrderId });

    const attacker = new mongoose.Types.ObjectId().toString();

    await expect(
      PaymentVerificationService.verifyPayment(
        {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signOrderPayment(razorpayOrderId, paymentId),
        },
        attacker,
        'user',
        'frontend',
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(await Order.find({})).toHaveLength(0);
  });

  it('rejects when the payment maps to a different Razorpay order id', async () => {
    const { user, product } = await seedUserAndProduct();
    const razorpayOrderId = 'order_TEST';
    const paymentId = 'pay_TEST';
    await seedPaymentAttempt({
      userId: user._id,
      productId: product._id,
      total: 500,
      razorpayOrderId,
    });
    // Gateway says this payment belongs to a *different* order.
    mockGatewayPayment({ amount: 50000, order_id: 'order_SOMEONE_ELSE' });

    await expect(
      PaymentVerificationService.verifyPayment(
        {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signOrderPayment(razorpayOrderId, paymentId),
        },
        user._id.toString(),
        'user',
        'frontend',
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(await Order.find({})).toHaveLength(0);
  });
});
