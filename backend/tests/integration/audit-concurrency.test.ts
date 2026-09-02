import './setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import EventJob from '../../src/domains/event_operations/models/EventJob';
import { EventBookingManagementService } from '../../src/services/eventBooking/EventBookingManagementService';
import {
  EventResourcePlanningService,
  DailyEventCapacity,
} from '../../src/services/eventBooking/EventResourcePlanningService';
import { EventJobWebhookHandler } from '../../src/services/payments/EventJobWebhookHandler';
import PaymentAudit from '../../src/models/PaymentAudit';
import OutboxEvent from '../../src/models/OutboxEvent';
import crypto from 'crypto';
import PaymentWebhookEvent from '../../src/models/PaymentWebhookEvent';
import { PaymentVerificationService } from '../../src/services/PaymentVerificationService';
import User from '../../src/models/User';

vi.mock('../../src/utils/payment/RazorpayGateway', () => {
  return {
    RazorpayGateway: {
      verifyPaymentSignature: vi.fn().mockReturnValue(true),
      getPayment: vi.fn().mockResolvedValue({
        id: 'pay_333',
        order_id: 'order_333',
        amount: 500000,
        currency: 'INR',
        status: 'captured',
      }),
    },
  };
});

describe('Event Booking Concurrency and Idempotency Audit', () => {
  let user: any;

  beforeEach(async () => {
    user = await User.create({
      name: 'Audit User',
      email: 'audit@example.com',
      passwordHash: 'password123',
    });
  });

  afterEach(async () => {
    await EventJob.deleteMany({});
    await DailyEventCapacity.deleteMany({});
    await PaymentAudit.deleteMany({});
    await OutboxEvent.deleteMany({});
    await User.deleteMany({});
    vi.restoreAllMocks();
  });

  const createDraftBooking = async (date: Date) => {
    const result = await EventBookingManagementService.createInquiry(user._id.toString(), {
      title: 'Audit Event',
      date: date.toISOString(),
      eventType: 'Wedding',
    });
    const booking = result.booking;
    booking.pricing.paymentStatus = 'paid';
    await booking.save();
    return booking;
  };

  it('1. Atomic Capacity Contention (Last slot)', async () => {
    const date = new Date('2028-01-01T10:00:00Z');

    // Set max slots to 1 for this date
    await DailyEventCapacity.create({
      dateStr: '2028-01-01',
      maxSlots: 1,
      slotsUsed: 0,
      bookings: [],
    });

    const bookingA = await createDraftBooking(date);
    const bookingB = await createDraftBooking(date);

    // Concurrently confirm both
    const results = await Promise.allSettled([
      EventBookingManagementService.adminUpdateStatus(
        bookingA._id.toString(),
        'confirmed',
        user._id.toString(),
      ),
      EventBookingManagementService.adminUpdateStatus(
        bookingB._id.toString(),
        'confirmed',
        user._id.toString(),
      ),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Assert exactly 1 confirmed and 1 rejected
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify database capacity state
    const capacity = await DailyEventCapacity.findOne({ dateStr: '2028-01-01' });
    expect(capacity?.slotsUsed).toBe(1);
    expect(capacity?.bookings.length).toBe(1);

    // Verify booking states
    const bA = await EventJob.findById(bookingA._id);
    const bB = await EventJob.findById(bookingB._id);
    expect([bA?.status, bB?.status].sort()).toEqual(['confirmed', 'draft'].sort());
  });

  it('2. Completed Capacity Semantics', async () => {
    const date = new Date('2028-02-01T10:00:00Z');

    await DailyEventCapacity.create({
      dateStr: '2028-02-01',
      maxSlots: 1,
      slotsUsed: 0,
      bookings: [],
    });

    const bookingA = await createDraftBooking(date);

    // Confirm A
    await EventBookingManagementService.adminUpdateStatus(
      bookingA._id.toString(),
      'confirmed',
      user._id.toString(),
    );

    let capacity = await DailyEventCapacity.findOne({ dateStr: '2028-02-01' });
    expect(capacity?.slotsUsed).toBe(1);

    // Complete A
    await EventBookingManagementService.adminUpdateStatus(
      bookingA._id.toString(),
      'completed',
      user._id.toString(),
    );

    // Assert historical record exists (slotsUsed remains 1 for historical accuracy,
    // BUT since maxSlots is 1, a new booking B would fail IF it shares the same date.
    // WAIT. If it's on the same date, does it block B?
    // Let's create Booking B on the SAME date.
    const bookingB = await createDraftBooking(date);

    let failed = false;
    try {
      await EventBookingManagementService.adminUpdateStatus(
        bookingB._id.toString(),
        'confirmed',
        user._id.toString(),
      );
    } catch (err) {
      failed = true;
    }

    expect(failed).toBe(true); // Historical slot is retained
  });

  it('3. Double Cancellation Resource Release', async () => {
    const date = new Date('2028-03-01T10:00:00Z');
    const booking = await createDraftBooking(date);

    await EventBookingManagementService.adminUpdateStatus(
      booking._id.toString(),
      'confirmed',
      user._id.toString(),
    );

    let capacity = await DailyEventCapacity.findOne({ dateStr: '2028-03-01' });
    expect(capacity?.slotsUsed).toBe(1);

    // Cancel once
    await EventBookingManagementService.adminUpdateStatus(
      booking._id.toString(),
      'cancelled',
      user._id.toString(),
    );
    capacity = await DailyEventCapacity.findOne({ dateStr: '2028-03-01' });
    expect(capacity?.slotsUsed).toBe(0);

    // Cancel again
    try {
      await EventBookingManagementService.adminUpdateStatus(
        booking._id.toString(),
        'cancelled',
        user._id.toString(),
      );
    } catch (e) {} // it might throw an error if already cancelled, but we just want to ensure it doesn't double decrement

    capacity = await DailyEventCapacity.findOne({ dateStr: '2028-03-01' });

    // Slots used should NOT be negative
    expect(capacity?.slotsUsed).toBe(0);
  });

  it('4. Sequential Duplicate Webhooks', async () => {
    const date = new Date('2028-04-01T10:00:00Z');
    const booking = await createDraftBooking(date);
    // Put booking in payment state
    booking.status = 'pending_payment';
    booking.pricing.depositAmount = 5000;
    booking.razorpayOrderId = 'order_123';
    await booking.save();

    const payload = {
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            order_id: 'order_123',
            amount: 500000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const signature = 'fake_sig';
    // Webhook 1
    const res1 = await EventJobWebhookHandler.handleWebhookEvent(
      'payment.captured',
      payload,
      signature,
      'evt_1',
      booking._id.toString(),
    );
    expect(res1.status).toBe(200);

    // Webhook 2 (Duplicate)
    const res2 = await EventJobWebhookHandler.handleWebhookEvent(
      'payment.captured',
      payload,
      signature,
      'evt_2',
      booking._id.toString(),
    );
    expect(res2.status).toBe(200);

    // Assert state
    const updatedBooking = await EventJob.findById(booking._id);
    expect(updatedBooking?.status).toBe('confirmed');
    expect(updatedBooking?.payments?.length).toBe(1); // No duplicate payments

    const capacity = await DailyEventCapacity.findOne({ dateStr: '2028-04-01' });
    expect(capacity?.slotsUsed).toBe(1); // Claimed exactly once
  });

  it('5. Concurrent Duplicate Webhooks', async () => {
    const date = new Date('2028-05-01T10:00:00Z');
    const booking = await createDraftBooking(date);
    booking.status = 'pending_payment';
    booking.pricing.depositAmount = 5000;
    booking.razorpayOrderId = 'order_222';
    await booking.save();

    const payload = {
      payload: {
        payment: {
          entity: {
            id: 'pay_222',
            order_id: 'order_222',
            amount: 500000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const signature = 'fake_sig';

    const results = await Promise.allSettled([
      EventJobWebhookHandler.handleWebhookEvent(
        'payment.captured',
        payload,
        signature,
        'evt_A',
        booking._id.toString(),
      ),
      EventJobWebhookHandler.handleWebhookEvent(
        'payment.captured',
        payload,
        signature,
        'evt_B',
        booking._id.toString(),
      ),
    ]);

    const updatedBooking = await EventJob.findById(booking._id);
    expect(updatedBooking?.status).toBe('confirmed');
    expect(updatedBooking?.payments?.length).toBe(1);

    const capacity = await DailyEventCapacity.findOne({ dateStr: '2028-05-01' });
    expect(capacity?.slotsUsed).toBe(1);
  });

  it('6. Frontend Verification + Webhook Race', async () => {
    const date = new Date('2028-06-01T10:00:00Z');
    const booking = await createDraftBooking(date);
    booking.status = 'pending_payment';
    booking.pricing.depositAmount = 5000;
    booking.razorpayOrderId = 'order_333';
    await booking.save();

    const payload = {
      payload: {
        payment: {
          entity: {
            id: 'pay_333',
            order_id: 'order_333',
            amount: 500000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };
    const signature = 'fake_sig';

    // Run them concurrently
    const results = await Promise.allSettled([
      EventJobWebhookHandler.handleWebhookEvent(
        'payment.captured',
        payload,
        signature,
        'evt_C',
        booking._id.toString(),
      ),
      PaymentVerificationService.verifyPayment(
        {
          razorpay_order_id: 'order_333',
          razorpay_payment_id: 'pay_333',
          razorpay_signature: 'fake_sig',
        },
        user._id.toString(),
        'user',
        'webhook',
      ),
    ]);

    const updatedBooking = await EventJob.findById(booking._id);
    expect(updatedBooking?.status).toBe('confirmed');
    expect(updatedBooking?.payments?.length).toBe(1);

    const capacity = await DailyEventCapacity.findOne({ dateStr: '2028-06-01' });
    expect(capacity?.slotsUsed).toBe(1);
  });

  it('7. Failed Resource Claim Rollback', async () => {
    const date = new Date('2028-07-01T10:00:00Z');

    await DailyEventCapacity.create({
      dateStr: '2028-07-01',
      maxSlots: 0, // No slots available!
      slotsUsed: 0,
      bookings: [],
    });

    const booking = await createDraftBooking(date);

    let failed = false;
    try {
      await EventBookingManagementService.adminUpdateStatus(
        booking._id.toString(),
        'confirmed',
        user._id.toString(),
      );
    } catch (err) {
      failed = true;
    }

    expect(failed).toBe(true);

    // Verify it rolled back
    const updatedBooking = await EventJob.findById(booking._id);
    expect(updatedBooking?.status).toBe('draft'); // Still draft!
  });
});
