import '../setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';

import { PaymentVerificationService } from '../../../src/services/PaymentVerificationService';
import { PaymentWebhookService } from '../../../src/services/PaymentWebhookService';
import { UnifiedWebhookRouter } from '../../../src/services/payments/UnifiedWebhookRouter';
import { PaymentStateMachine } from '../../../src/services/payments/PaymentStateMachine';
import { RazorpayGateway } from '../../../src/utils/payment/RazorpayGateway';
import { verifyRazorpayWebhookSignature } from '../../../src/utils/security/webhookSignature';
import User from '../../../src/models/User';
import Product from '../../../src/models/Product';
import Category from '../../../src/models/Category';
import PaymentAttempt from '../../../src/models/PaymentAttempt';
import PaymentWebhookEvent from '../../../src/models/PaymentWebhookEvent';
import Order from '../../../src/models/Order';
import PaymentAudit from '../../../src/models/PaymentAudit';

vi.mock('../../../src/services/TransactionalEmailService', () => ({
  TransactionalEmailService: {
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(true),
    sendOrderConfirmationEmail: vi.fn().mockResolvedValue(true),
  },
}));

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_razorpay_secret_key_12345';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_67890';

const signOrderPayment = (orderId: string, paymentId: string): string =>
  crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

const signWebhookPayload = (rawBody: Buffer, secret = WEBHOOK_SECRET): string =>
  crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

const seedCustomerAndProduct = async () => {
  const category = await Category.create({ name: 'Festive', slug: `festive-${Date.now()}` } as any);
  const user = await User.create({
    name: 'Adversarial Tester',
    email: `adversary_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
    password: 'hashed_placeholder_value',
    isVerified: true,
    walletBalance: 0,
  } as any);
  const product = await Product.create({
    title: 'Silk Toran',
    slug: `silk-toran-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    primaryCategory: category._id,
    price: 1500,
    imageSrc: 'https://example.com/toran.webp',
    description: 'Handcrafted door hanging',
    stock: 50,
  } as any);
  return { user, product };
};

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
          title: 'Silk Toran',
          price: opts.total,
          quantity: 1,
          imageSrc: 'https://example.com/toran.webp',
        },
      ],
      shippingAddress: {
        name: 'Adversarial Tester',
        phone: '9876543210',
        email: 'tester@example.com',
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
      invoiceNumber: `INV-ADV-${Date.now()}`,
    },
  } as any);
};

describe('Adversarial Payment Security & Webhook Hardening Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Webhook Signature Forgery & Tampering', () => {
    it('rejects a webhook payload when signature is forged or generated with wrong secret', () => {
      const rawPayload = Buffer.from(
        JSON.stringify({
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_FORGED', amount: 50000 } } },
        }),
      );
      const forgedSig = signWebhookPayload(rawPayload, 'wrong_attacker_secret');
      const isValid = verifyRazorpayWebhookSignature(forgedSig, rawPayload, WEBHOOK_SECRET);
      expect(isValid).toBe(false);
    });

    it('rejects a webhook payload when the raw bytes are tampered after signature generation', () => {
      const originalPayload = Buffer.from(
        JSON.stringify({ event: 'payment.captured', amount: 50000 }),
      );
      const validSig = signWebhookPayload(originalPayload, WEBHOOK_SECRET);

      // Attacker tampers amount to 100 paise
      const tamperedPayload = Buffer.from(
        JSON.stringify({ event: 'payment.captured', amount: 100 }),
      );

      const isValid = verifyRazorpayWebhookSignature(validSig, tamperedPayload, WEBHOOK_SECRET);
      expect(isValid).toBe(false);
    });

    it('rejects empty or null webhook signatures', () => {
      const payload = Buffer.from('{"event":"payment.captured"}');
      expect(verifyRazorpayWebhookSignature('', payload, WEBHOOK_SECRET)).toBe(false);
      expect(verifyRazorpayWebhookSignature(null as any, payload, WEBHOOK_SECRET)).toBe(false);
      expect(verifyRazorpayWebhookSignature('valid_hex', Buffer.alloc(0), WEBHOOK_SECRET)).toBe(
        false,
      );
    });
  });

  describe('2. Authoritative Gateway Verification vs Client-Reported State', () => {
    it('refuses client claims of payment success when gateway reports status=failed', async () => {
      const { user, product } = await seedCustomerAndProduct();
      const rzpOrderId = `order_ADV_${Date.now()}`;
      const rzpPaymentId = `pay_ADV_${Date.now()}`;

      await seedPaymentAttempt({
        userId: user._id,
        productId: product._id,
        total: 1500,
        razorpayOrderId: rzpOrderId,
      });

      // Gateway says payment failed
      vi.spyOn(RazorpayGateway, 'getPayment').mockResolvedValue({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 150000,
        currency: 'INR',
        status: 'failed',
      } as any);

      await expect(
        PaymentVerificationService.verifyPayment(
          {
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            razorpay_signature: signOrderPayment(rzpOrderId, rzpPaymentId),
          },
          user._id.toString(),
          'user',
          'frontend',
        ),
      ).rejects.toMatchObject({ statusCode: 400 });

      // Ensure no paid order was created
      const orders = await Order.find({ razorpayOrderId: rzpOrderId });
      expect(orders).toHaveLength(0);

      // Verify tamper/audit record was written
      const audits = await PaymentAudit.find({ razorpayOrderId: rzpOrderId });
      expect(audits.length).toBeGreaterThan(0);
      expect(audits[0].status).toBe('tampered');
    });

    it('blocks payment verification when gateway currency is USD instead of INR', async () => {
      const { user, product } = await seedCustomerAndProduct();
      const rzpOrderId = `order_CURR_${Date.now()}`;
      const rzpPaymentId = `pay_CURR_${Date.now()}`;

      await seedPaymentAttempt({
        userId: user._id,
        productId: product._id,
        total: 1500,
        razorpayOrderId: rzpOrderId,
      });

      vi.spyOn(RazorpayGateway, 'getPayment').mockResolvedValue({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 150000,
        currency: 'USD', // Currency spoofing
        status: 'captured',
      } as any);

      await expect(
        PaymentVerificationService.verifyPayment(
          {
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            razorpay_signature: signOrderPayment(rzpOrderId, rzpPaymentId),
          },
          user._id.toString(),
          'user',
          'frontend',
        ),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(await Order.countDocuments({ razorpayOrderId: rzpOrderId })).toBe(0);
    });

    it('blocks payment verification when payment maps to an entirely different Razorpay order ID', async () => {
      const { user, product } = await seedCustomerAndProduct();
      const rzpOrderId = `order_ATTACK_${Date.now()}`;
      const rzpPaymentId = `pay_LEGIT_${Date.now()}`;

      await seedPaymentAttempt({
        userId: user._id,
        productId: product._id,
        total: 1500,
        razorpayOrderId: rzpOrderId,
      });

      vi.spyOn(RazorpayGateway, 'getPayment').mockResolvedValue({
        id: rzpPaymentId,
        order_id: 'order_LEGIT_SOMEONE_ELSE', // Mismatched order
        amount: 150000,
        currency: 'INR',
        status: 'captured',
      } as any);

      await expect(
        PaymentVerificationService.verifyPayment(
          {
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            razorpay_signature: signOrderPayment(rzpOrderId, rzpPaymentId),
          },
          user._id.toString(),
          'user',
          'frontend',
        ),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(await Order.countDocuments({ razorpayOrderId: rzpOrderId })).toBe(0);
    });
  });

  describe('3. Concurrency, Replay & Idempotency Resilience', () => {
    it('concurrent payment verification requests result in exactly ONE order with matching IDs', async () => {
      const { user, product } = await seedCustomerAndProduct();
      const rzpOrderId = `order_RACE_${Date.now()}`;
      const rzpPaymentId = `pay_RACE_${Date.now()}`;

      await seedPaymentAttempt({
        userId: user._id,
        productId: product._id,
        total: 1500,
        razorpayOrderId: rzpOrderId,
      });

      vi.spyOn(RazorpayGateway, 'getPayment').mockResolvedValue({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 150000,
        currency: 'INR',
        status: 'captured',
      } as any);

      const payload = {
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: signOrderPayment(rzpOrderId, rzpPaymentId),
      };

      // Helper that executes verifyPayment and handles expected concurrency responses
      // (409 Conflict, transient transaction WriteConflict)
      const executeWithConcurrencyHandling = async () => {
        try {
          return await PaymentVerificationService.verifyPayment(
            payload,
            user._id.toString(),
            'user',
            'frontend',
          );
        } catch (err: any) {
          if (
            err.statusCode === 409 ||
            err.message?.includes('Write conflict') ||
            err.message?.includes('Please retry')
          ) {
            return null; // Gracefully rejected due to active lock or write conflict
          }
          throw err;
        }
      };

      // Fire 2 simultaneous verification attempts
      const [order1, order2] = await Promise.all([
        executeWithConcurrencyHandling(),
        executeWithConcurrencyHandling(),
      ]);

      // At least one must succeed or have locked the record
      const ordersInDb = await Order.countDocuments({ razorpayOrderId: rzpOrderId });
      expect(ordersInDb).toBeLessThanOrEqual(1);

      // Now execute an explicit retry (as a browser client would) after the initial race
      const finalOrder = await PaymentVerificationService.verifyPayment(
        payload,
        user._id.toString(),
        'user',
        'frontend',
      );

      expect(finalOrder).toBeTruthy();
      expect(await Order.countDocuments({ razorpayOrderId: rzpOrderId })).toBe(1);
    });

    it('webhook redelivery with identical eventId executes downstream router exactly once', async () => {
      vi.spyOn(UnifiedWebhookRouter, 'routeWebhookEvent').mockResolvedValue({
        status: 200,
        message: 'processed',
      } as any);

      const eventId = `evt_adversarial_${Date.now()}`;
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123' } } },
      };

      const res1 = await PaymentWebhookService.processRazorpayWebhook(
        body.event,
        body,
        'sig_1',
        eventId,
      );
      const res2 = await PaymentWebhookService.processRazorpayWebhook(
        body.event,
        body,
        'sig_1',
        eventId,
      );
      const res3 = await PaymentWebhookService.processRazorpayWebhook(
        body.event,
        body,
        'sig_1',
        eventId,
      );

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);
      expect(res2.message).toMatch(/duplicate/i);
      expect(res3.message).toMatch(/duplicate/i);

      // Downstream router called exactly once
      expect(UnifiedWebhookRouter.routeWebhookEvent).toHaveBeenCalledTimes(1);

      // Exactly 1 webhook event row stored
      expect(await PaymentWebhookEvent.countDocuments({ razorpayEventId: eventId })).toBe(1);
    });
  });

  describe('4. Payment State Machine Out-of-Order Transition Safety', () => {
    it('preserves PAID state and rejects regressive transitions from stale failure webhooks', () => {
      // Once an order is 'paid', transitioning to 'failed' or 'pending' is invalid
      expect(PaymentStateMachine.canTransition('paid', 'failed')).toBe(false);
      expect(PaymentStateMachine.canTransition('paid', 'pending')).toBe(false);

      // Valid forward transitions from 'paid' are only 'processing', 'refunded', 'partially_refunded'
      expect(PaymentStateMachine.canTransition('paid', 'refunded')).toBe(true);
      expect(PaymentStateMachine.canTransition('paid', 'partially_refunded')).toBe(true);
    });

    it('rejects transitions from terminal REFUNDED state backwards to PAID', () => {
      expect(PaymentStateMachine.canTransition('refunded', 'paid')).toBe(false);
      expect(PaymentStateMachine.canTransition('refunded', 'pending')).toBe(false);
    });
  });
});
