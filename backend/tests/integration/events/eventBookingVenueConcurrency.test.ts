import '../setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import EventJob from '../../../src/models/EventJob';
import {
  DailyEventCapacity,
  EventResourcePlanningService,
} from '../../../src/services/eventBooking/EventResourcePlanningService';
import { EventBookingManagementService } from '../../../src/services/eventBooking/EventBookingManagementService';
import User from '../../../src/models/User';
import ApiError from '../../../src/utils/ApiError';

describe('Event Booking Concurrency & Venue Contention Suite', () => {
  let adminUser: any;
  let customerUser: any;

  beforeEach(async () => {
    await EventJob.deleteMany({});
    await DailyEventCapacity.deleteMany({});
    await User.deleteMany({});

    adminUser = await User.create({
      name: 'Event Admin',
      email: `admin_event_${Date.now()}@example.com`,
      password: 'password_hash_placeholder',
      role: 'admin',
      isVerified: true,
    } as any);

    customerUser = await User.create({
      name: 'Event Customer',
      email: `customer_event_${Date.now()}@example.com`,
      password: 'password_hash_placeholder',
      role: 'user',
      isVerified: true,
    } as any);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  const createDraftEvent = async (opts: {
    date: Date;
    venueAddress: string;
    start: string;
    end: string;
  }) => {
    const result = await EventBookingManagementService.createInquiry(customerUser._id.toString(), {
      title: 'Wedding Gala',
      date: opts.date.toISOString(),
      eventType: 'Wedding',
      venue: {
        name: 'Grand Ballroom',
        address: opts.venueAddress,
        city: 'Hyderabad',
      },
      timing: {
        start: opts.start,
        end: opts.end,
      },
    } as any);
    const booking = result.booking;
    booking.pricing.paymentStatus = 'paid';
    await booking.save();
    return booking;
  };

  it('1. Same Venue Time-Overlap Contention: Two concurrent bookings for the same venue and overlapping slot', async () => {
    const eventDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
    const venue = 'Grand Ballroom, Park Hyatt, Banjara Hills';

    // Allow 5 daily slots so daily capacity is not the bottleneck
    const dateStr = eventDate.toISOString().split('T')[0];
    await DailyEventCapacity.create({
      dateStr,
      maxSlots: 5,
      slotsUsed: 0,
      bookings: [],
    });

    // Booking A: 10:00 AM - 02:00 PM
    const bookingA = await createDraftEvent({
      date: eventDate,
      venueAddress: venue,
      start: '10:00 AM',
      end: '02:00 PM',
    });

    // Booking B: 01:00 PM - 05:00 PM (overlaps with Booking A + 2hr setup/teardown window)
    const bookingB = await createDraftEvent({
      date: eventDate,
      venueAddress: venue,
      start: '01:00 PM',
      end: '05:00 PM',
    });

    // Confirm Booking A
    const confirmedA = await EventBookingManagementService.adminUpdateStatus(
      bookingA._id.toString(),
      'confirmed',
      adminUser._id.toString(),
    );
    expect(confirmedA.status).toBe('confirmed');

    // Attempting to confirm Booking B for overlapping venue window must be rejected
    await expect(
      EventBookingManagementService.adminUpdateStatus(
        bookingB._id.toString(),
        'confirmed',
        adminUser._id.toString(),
      ),
    ).rejects.toThrow(ApiError);

    try {
      await EventBookingManagementService.adminUpdateStatus(
        bookingB._id.toString(),
        'confirmed',
        adminUser._id.toString(),
      );
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.message).toMatch(/Venue is already booked for this time slot/i);
    }

    // Booking B status remains draft
    const freshB = await EventJob.findById(bookingB._id);
    expect(freshB?.status).toBe('draft');
  });

  it('2. Non-Overlapping Venue Window on Same Day: Permitted after setup buffer', async () => {
    const eventDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
    const venue = 'Grand Ballroom, Park Hyatt, Banjara Hills';

    const dateStr = eventDate.toISOString().split('T')[0];
    await DailyEventCapacity.create({
      dateStr,
      maxSlots: 5,
      slotsUsed: 0,
      bookings: [],
    });

    // Morning event: 08:00 AM - 12:00 PM
    const morningBooking = await createDraftEvent({
      date: eventDate,
      venueAddress: venue,
      start: '08:00 AM',
      end: '12:00 PM',
    });

    // Evening event: 06:00 PM - 10:00 PM (6 hours later, well past 2hr teardown buffer)
    const eveningBooking = await createDraftEvent({
      date: eventDate,
      venueAddress: venue,
      start: '06:00 PM',
      end: '10:00 PM',
    });

    // Both should confirm cleanly without venue collision
    const confirmedMorning = await EventBookingManagementService.adminUpdateStatus(
      morningBooking._id.toString(),
      'confirmed',
      adminUser._id.toString(),
    );
    const confirmedEvening = await EventBookingManagementService.adminUpdateStatus(
      eveningBooking._id.toString(),
      'confirmed',
      adminUser._id.toString(),
    );

    expect(confirmedMorning.status).toBe('confirmed');
    expect(confirmedEvening.status).toBe('confirmed');
  });

  it('3. Cancellation vs Confirmation Race: Releasing a slot permits immediate re-claim', async () => {
    const eventDate = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const dateStr = eventDate.toISOString().split('T')[0];

    // Set max slots to strictly 1
    await DailyEventCapacity.create({
      dateStr,
      maxSlots: 1,
      slotsUsed: 0,
      bookings: [],
    });

    const booking1 = await createDraftEvent({
      date: eventDate,
      venueAddress: 'Venue 1',
      start: '10:00 AM',
      end: '02:00 PM',
    });

    const booking2 = await createDraftEvent({
      date: eventDate,
      venueAddress: 'Venue 2',
      start: '10:00 AM',
      end: '02:00 PM',
    });

    // Confirm booking1 -> fills the single available slot
    await EventBookingManagementService.adminUpdateStatus(
      booking1._id.toString(),
      'confirmed',
      adminUser._id.toString(),
    );

    // Verify booking2 cannot confirm (409)
    await expect(
      EventBookingManagementService.adminUpdateStatus(
        booking2._id.toString(),
        'confirmed',
        adminUser._id.toString(),
      ),
    ).rejects.toThrow(ApiError);

    // Cancel booking1
    await EventBookingManagementService.adminUpdateStatus(
      booking1._id.toString(),
      'cancelled',
      adminUser._id.toString(),
    );

    // Now booking2 should immediately succeed in claiming the freed slot
    const confirmed2 = await EventBookingManagementService.adminUpdateStatus(
      booking2._id.toString(),
      'confirmed',
      adminUser._id.toString(),
    );
    expect(confirmed2.status).toBe('confirmed');

    // Verify final daily capacity reflects exactly 1 slot used by booking2
    const capacity = await DailyEventCapacity.findOne({ dateStr });
    expect(capacity?.slotsUsed).toBe(1);
    expect(capacity?.bookings).toEqual([booking2._id.toString()]);
  });
});
