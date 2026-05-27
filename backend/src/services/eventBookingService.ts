import mongoose from 'mongoose';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import { generateUniqueBookingId } from '../utils/bookingId';
import { emailQueue, notificationQueue } from '../jobs/queues';
import logger from '../config/logger';

export class EventBookingService {
  /**
   * Encapsulates the business logic for creating a new booking inquiry.
   */
  static async createBooking(userId: string, data: any) {
    const { eventPackageId, title, eventType, date, timing, guestCount, venue, customization, selectedAddons, inspirationImages } = data;

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
    const CANONICAL_ADDONS: Record<string, number> = {
      "Artisanal Wooden Swings / Ooyala": 7500,
      "Gilded Grand Arch Entry Archway": 12000,
      "Live Nadaswaram Instrumental Stage": 15000,
      "Grand Brass Diyas Canopy Set (8 Props)": 9500,
      "Fresh Rose petals pathways carpet (50ft)": 5000,
      "Traditional Handpainted Kolam/Rangoli": 3500,
    };

    const addOnCharges = (selectedAddons || []).reduce((acc: number, item: any) => {
      const canonicalPrice = CANONICAL_ADDONS[item.name] || 0;
      item.price = canonicalPrice;
      return acc + canonicalPrice;
    }, 0);
    const totalPrice = rentalFee + addOnCharges;

    const session = await mongoose.startSession();
    session.startTransaction();
    let booking;

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
          'venue.address': { $regex: new RegExp(`^${venue.address.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i') },
          status: { $in: ['confirmed', 'payment_processing', 'setup_in_progress'] }
        }).session(session);

        if (duplicate) {
          await session.abortTransaction();
          throw new ApiError(409, 'This venue is already booked for the selected date.');
        }
      }

      const bookings = await EventBooking.create([{
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
      }], { session });
      
      booking = bookings[0];
      const BookingMessage = require('../models/BookingMessage').default;
      await BookingMessage.create([{
        bookingId: booking._id,
        sender: 'admin',
        message: 'Welcome to your premium Siri Arts Event Studio! Our designers are actively reviewing your floorplans, venue, and Pinterest visual boards.',
        timestamp: new Date(),
      }], { session });
      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      if (err.code === 11000) throw new ApiError(409, 'This venue is already booked for the selected date.');
      throw err;
    } finally {
      session.endSession();
    }

    const eventDateStr = new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    } as const);

    // Enqueue background jobs via BullMQ for side-effects
    await notificationQueue.add('adminNotification', {
      title: 'New Luxury Event Booking Inquiry',
      message: `${user.name || 'A customer'} submitted a new event booking inquiry ("${booking.title}") for ${eventDateStr}.`,
      type: 'custom_request',
      actionLink: `/admin/bookings`,
      metadata: { bookingId: booking._id.toString() }
    });

    await emailQueue.add('submissionEmail', {
      to: user.email,
      subject: `Your Booking Inquiry for ${booking.title}`,
      html: `<p>Dear ${user.name}, your event design inquiry is received.</p>`
    });

    return { booking, user };
  }
}
