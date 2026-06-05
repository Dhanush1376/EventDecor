import mongoose from 'mongoose';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import { generateUniqueBookingId } from '../utils/bookingId';
import { DistributedLock } from '../utils/DistributedLock';
import OutboxEvent from '../models/OutboxEvent';

export class EventBookingService {
  /**
   * Encapsulates the business logic for creating a new booking inquiry.
   */
  static async createBooking(userId: string, data: any) {
    const {
      eventPackageId,
      title,
      eventType,
      date,
      timing,
      guestCount,
      venue,
      customization,
      selectedAddons,
      inspirationImages,
    } = data;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Authorized customer account not found.');
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      throw new ApiError(400, 'Invalid event date format.');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (bookingDate < startOfToday) {
      throw new ApiError(400, 'Event date must be in the future.');
    }

    const bookingId = await generateUniqueBookingId();

    let rentalFee = 25000;
    if (eventPackageId) {
      const pkg = await Event.findById(eventPackageId);
      if (pkg) rentalFee = pkg.basePrice || 35000;
    }
    const { cmsCache } = require('../utils/MemoryCache');
    const ContentSection = require('../models/ContentSection').default;
    const addonsConfig = await cmsCache.getOrSet('canonical_addons', async () => {
      return await ContentSection.findOne({ sectionKey: 'canonical_addons' });
    });

    const CANONICAL_ADDONS: Record<string, number> = addonsConfig?.data || {
      'Artisanal Wooden Swings / Ooyala': 7500,
      'Gilded Grand Arch Entry Archway': 12000,
      'Live Nadaswaram Instrumental Stage': 15000,
      'Grand Brass Diyas Canopy Set (8 Props)': 9500,
      'Fresh Rose petals pathways carpet (50ft)': 5000,
      'Traditional Handpainted Kolam/Rangoli': 3500,
    };

    const addOnCharges = (selectedAddons || []).reduce((acc: number, item: any) => {
      const canonicalPrice = CANONICAL_ADDONS[item.name] || 0;
      item.price = canonicalPrice;
      return acc + canonicalPrice;
    }, 0);
    const totalPrice = rentalFee + addOnCharges;

    const session = await mongoose.startSession();

    // Normalize venue address for distributed lock
    const normalizedVenue = venue?.address
      ? venue.address.trim().toLowerCase().replace(/\s+/g, '_')
      : 'tbd';
    const dateStr = new Date(date).toISOString().split('T')[0];
    const lockKey = `event_booking_${normalizedVenue}_${dateStr}`;

    const userRecord = user;

    const booking = await DistributedLock.withLock(lockKey, async () => {
      session.startTransaction();
      try {
        // 1. Double Booking Check
        if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
          const bDate = new Date(date);
          const startOfDay = new Date(bDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(bDate);
          endOfDay.setHours(23, 59, 59, 999);

          const duplicate = await EventBooking.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
            normalizedVenueAddress: normalizedVenue,
            status: { $in: ['confirmed', 'payment_processing', 'setup_in_progress'] },
          }).session(session);

          if (duplicate) {
            await session.abortTransaction();
            throw new ApiError(409, 'This venue is already booked for the selected date.');
          }
        }

        const bookings = await EventBooking.create(
          [
            {
              bookingId,
              user: userId,
              eventPackage: eventPackageId || null,
              title: title || `${eventType || 'Special'} Celebration`,
              eventType: eventType || 'Wedding',
              date: new Date(date),
              timing: timing || { start: '10:00 AM', end: '10:00 PM' },
              guestCount: parseInt(guestCount) || 100,
              venue: venue || { address: 'TBD', isOutdoor: false },
              customization: customization || {},
              selectedAddons: selectedAddons || [],
              inspirationImages: inspirationImages || [],
              pricing: {
                rentalFee,
                setupCharges: 0,
                transportationCost: 0,
                addOnCharges,
                depositAmount: Math.round(totalPrice * 0.25),
                totalPrice,
                pendingBalance: totalPrice,
                paymentStatus: 'unpaid' as const,
              },
              payments: [],
              status: 'draft' as const,
              assignedTeam: [],
              rentedInventory: [],
              clientApproved: false,
            },
          ],
          { session },
        );

        const newBooking = bookings[0];
        const BookingMessage = require('../models/BookingMessage').default;
        await BookingMessage.create(
          [
            {
              bookingId: newBooking._id,
              sender: 'admin',
              message:
                'Welcome to your premium Siri Arts Event Studio! Our designers are actively reviewing your floorplans, venue, and Pinterest visual boards.',
              timestamp: new Date(),
            },
          ],
          { session },
        );

        // Create an outbox event to guarantee email/notification delivery
        await OutboxEvent.create(
          [
            {
              aggregateId: newBooking._id.toString(),
              aggregateType: 'EventBooking',
              eventType: 'BookingInquirySubmitted',
              payload: { bookingId: newBooking._id.toString(), userId },
            },
          ],
          { session },
        );

        await session.commitTransaction();
        return newBooking;
      } catch (err: any) {
        await session.abortTransaction();
        if (err.code === 11000)
          throw new ApiError(409, 'This venue is already booked for the selected date.');
        throw err;
      } finally {
        session.endSession();
      }
    }); // End DistributedLock

    return { booking, user: userRecord };
  }
}
