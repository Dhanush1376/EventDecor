import Order from '../models/Order';
import PaymentWebhookEvent from '../models/PaymentWebhookEvent';
import { PaymentStateMachine } from '../services/payments/PaymentStateMachine';
import { PaymentRefundService } from '../services/PaymentRefundService';
import RefundRecord from '../models/RefundRecord';
import mongoose from 'mongoose';

jest.mock('../jobs/queues', () => ({
  webhookQueue: { add: jest.fn().mockResolvedValue({}) },
  refundQueue: { add: jest.fn().mockResolvedValue({}) },
  isQueuesReady: jest.fn().mockReturnValue(true),
}));

describe('Payment Integration & State Machine', () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB or connect to local test DB
    if (!process.env.MONGO_URI) {
      process.env.MONGO_URI = 'mongodb://localhost:27017/eventdecor_test_payment';
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    // ensure clean state
    await Order.deleteMany({});
    await PaymentWebhookEvent.deleteMany({});
    await RefundRecord.deleteMany({});
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await PaymentWebhookEvent.deleteMany({});
    await RefundRecord.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('PaymentStateMachine', () => {
    it('allows valid transitions', () => {
      expect(PaymentStateMachine.canTransition('pending', 'processing')).toBe(true);
      expect(PaymentStateMachine.canTransition('processing', 'paid')).toBe(true);
      expect(PaymentStateMachine.canTransition('paid', 'dispute_open')).toBe(true);
      expect(PaymentStateMachine.canTransition('paid', 'refunded')).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(PaymentStateMachine.canTransition('paid', 'pending')).toBe(false);
      expect(PaymentStateMachine.canTransition('failed', 'paid')).toBe(false);
      expect(PaymentStateMachine.canTransition('refunded', 'processing')).toBe(false);
    });

    it('transitions state correctly', () => {
      const order = { paymentStatus: 'pending', _id: '123' };
      PaymentStateMachine.transition(order, 'processing');
      expect(order.paymentStatus).toBe('processing');
    });

    it('throws error on invalid transition', () => {
      const order = { paymentStatus: 'paid', _id: '123' };
      expect(() => PaymentStateMachine.transition(order, 'pending')).toThrow(
        /Invalid payment state transition/i,
      );
    });
  });

  describe('Webhook Idempotency', () => {
    it('processes duplicate webhook events idempotently (only updates once)', async () => {
      const order = await Order.create({
        user: new mongoose.Types.ObjectId(),
        items: [],
        subtotal: 1000,
        total: 1000,
        shippingAddress: {
          name: 'Test',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Test St',
          locality: 'Test Locality',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
        paymentStatus: 'pending',
        razorpayOrderId: 'order_test_123',
      });

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: 'order_test_123',
              amount: 100000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      // We cannot call the actual endpoint easily without a valid signature,
      // so we simulate the internal service call or just mock the signature.
      // Since this is a unit/integration test for the service logic, let's call the service directly
      // or we can mock Razorpay signature.

      const { PaymentWebhookService } = require('../services/PaymentWebhookService');

      // Pre-create the event to simulate ingestion
      await PaymentWebhookEvent.create({
        razorpayEventId: 'evt_test_123',
        eventType: payload.event,
        payload: payload.payload,
        status: 'pending',
      });

      // Simulate concurrent webhooks using the core processor directly
      const promises = Array(10)
        .fill(0)
        .map(() => {
          return PaymentWebhookService.processRazorpayWebhookCore(
            payload.event,
            payload,
            'mock_signature',
            'evt_test_123',
          );
        });

      const results = await Promise.allSettled(promises);

      // Since all process Core concurrently, 1 should succeed and 9 should return 409 conflict
      const fulfilled = results.filter(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>[];
      expect(fulfilled.length).toBe(10); // They all fulfill because the core returns a 200/409 object rather than throwing

      // Debug log results removed

      const events = await PaymentWebhookEvent.find({ razorpayEventId: 'evt_test_123' });
      expect(events.length).toBe(1); // Unique index constraint

      const updatedOrder = await Order.findById(order._id);
      // Log removed
      expect(updatedOrder?.paymentStatus).toBe('paid');
    });
  });

  describe('Refund Lifecycle', () => {
    it('initiates, processes, and completes a refund', async () => {
      const order = await Order.create({
        user: new mongoose.Types.ObjectId(),
        items: [],
        subtotal: 1000,
        total: 1000,
        shippingAddress: {
          name: 'Test',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Test St',
          locality: 'Test Locality',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
        paymentStatus: 'paid',
        razorpayOrderId: 'order_test_refund',
        razorpayPaymentId: 'pay_test_refund',
      });

      // 1. Initiate Refund
      await PaymentRefundService.initiateAsyncRefund({
        amount: 1000,
        entityType: 'Order',
        entityId: (order._id as mongoose.Types.ObjectId).toString(),
        originalTransactionId: 'txn_refund_123',
        reason: 'customer_requested',
      });

      const refundRecord = await RefundRecord.findOne({ entityId: order._id });
      if (!refundRecord) throw new Error('RefundRecord not created');

      expect(refundRecord.status).toBe('pending');
      expect(refundRecord.amount).toBe(1000);

      // 2. We can simulate the webhook for refund completion
      const {
        PaymentRefundService: WebhookRefundService,
      } = require('../services/PaymentRefundService');
      await WebhookRefundService.processRefundWebhook(
        'refund.processed',
        {
          payload: {
            refund: {
              entity: {
                id: 'rfnd_test_123',
                payment_id: 'pay_test_refund',
                amount: 100000,
                status: 'processed',
                notes: {
                  refundRecordId: refundRecord._id.toString(),
                },
              },
            },
          },
        },
        'mock_signature',
        'evt_refund_123',
      );

      const processedRecord = await RefundRecord.findById(refundRecord._id);
      expect(processedRecord?.status).toBe('completed');
      expect(processedRecord?.razorpayRefundId).toBe('rfnd_test_123');

      // Simulate manual order state update that usually happens post-refund
      PaymentStateMachine.transition(order, 'refunded', 'Refunded successfully');
      await order.save();
      const finalOrder = await Order.findById(order._id);
      expect(finalOrder?.paymentStatus).toBe('refunded');
    });
  });
});
