import mongoose, { Schema, Document } from 'mongoose';
import ApiError from '../../utils/ApiError';

export interface IDailyEventCapacity extends Document {
  dateStr: string; // YYYY-MM-DD
  slotsUsed: number;
  maxSlots: number;
  bookings: string[]; // Array of booking IDs
}

const DailyEventCapacitySchema = new Schema({
  dateStr: { type: String, required: true, unique: true },
  slotsUsed: { type: Number, default: 0 },
  maxSlots: { type: Number, default: 3 },
  bookings: [{ type: String }],
});

export const DailyEventCapacity = mongoose.model<IDailyEventCapacity>(
  'DailyEventCapacity',
  DailyEventCapacitySchema,
);

export class EventResourcePlanningService {
  /**
   * Atomically claims a slot for a specific date.
   * Throws if max capacity is reached.
   */
  static async claimSlotAtomically(
    date: Date,
    bookingId: string,
    session?: mongoose.ClientSession,
  ) {
    const dateStr = new Date(date).toISOString().split('T')[0];

    // Ensure document exists
    await DailyEventCapacity.updateOne(
      { dateStr },
      { $setOnInsert: { dateStr, slotsUsed: 0, maxSlots: 3, bookings: [] } },
      { upsert: true, session },
    );

    // Atomically increment if under maxSlots
    const result = await DailyEventCapacity.findOneAndUpdate(
      {
        dateStr,
        $expr: { $lt: ['$slotsUsed', '$maxSlots'] },
        bookings: { $ne: bookingId }, // Prevent double-counting the same booking
      },
      {
        $inc: { slotsUsed: 1 },
        $push: { bookings: bookingId },
      },
      { session, returnDocument: 'after' },
    );

    if (!result) {
      // Check if it failed because it's already booked or because max capacity
      const doc = await DailyEventCapacity.findOne({ dateStr }).session(session || null);
      if (doc && doc.bookings.includes(bookingId)) {
        return true; // Already claimed
      }
      throw new ApiError(409, 'This date is fully booked. Maximum events per day reached.');
    }

    return true;
  }

  /**
   * Atomically releases a claimed slot.
   */
  static async releaseSlotAtomically(
    date: Date,
    bookingId: string,
    session?: mongoose.ClientSession,
  ) {
    const dateStr = new Date(date).toISOString().split('T')[0];

    await DailyEventCapacity.findOneAndUpdate(
      { dateStr, bookings: bookingId },
      {
        $inc: { slotsUsed: -1 },
        $pull: { bookings: bookingId },
      },
      { session },
    );
  }

  /**
   * Helper to parse time strings like '10:00 AM' into minutes from midnight
   */
  static parseTimeToMinutes(timeStr: string): number {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  /**
   * Checks if two bookings at the same venue overlap in time.
   */
  static async checkVenueTimeOverlap(
    date: Date,
    venueAddress: string,
    timing: { start: string; end: string },
    excludeBookingId: string,
    session?: mongoose.ClientSession,
  ) {
    if (!venueAddress || venueAddress.trim() === '' || venueAddress.toUpperCase() === 'TBD') {
      return false;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const EventBooking = require('../../models/EventBooking').default;

    // Normalize venue string for robust matching: alphanumeric only
    const normalizedVenue = venueAddress.toLowerCase().replace(/[^a-z0-9]/g, '');

    const sameDayBookings = await EventBooking.find({
      _id: { $ne: excludeBookingId },
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] },
    })
      .session(session || null)
      .lean();

    const newStart = this.parseTimeToMinutes(timing.start);
    const newEnd = this.parseTimeToMinutes(timing.end);

    for (const booking of sameDayBookings) {
      if (booking.venue?.address) {
        const existingNormalized = booking.venue.address.toLowerCase().replace(/[^a-z0-9]/g, '');
        // If it's the exact same venue string (ignoring case/symbols)
        if (
          existingNormalized === normalizedVenue ||
          existingNormalized.includes(normalizedVenue) ||
          normalizedVenue.includes(existingNormalized)
        ) {
          // Check time overlap
          const existingStart = this.parseTimeToMinutes(booking.timing?.start || '00:00 AM');
          const existingEnd = this.parseTimeToMinutes(booking.timing?.end || '11:59 PM');

          // Overlap condition: (StartA < EndB) and (EndA > StartB)
          // We add a 2-hour buffer (120 mins) for setup/teardown between events
          if (newStart < existingEnd + 120 && newEnd > existingStart - 120) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
