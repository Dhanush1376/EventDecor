import mongoose from 'mongoose';
import EventJob from '../domains/event_operations/models/EventJob';
import Event from '../models/Event';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import { generateUniqueBookingId } from '../utils/bookingId';
import { DistributedLock } from '../utils/DistributedLock';
import OutboxEvent from '../models/OutboxEvent';

export class EventJobService {
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
    const { cmsCache } = require('../utils/cache/MemoryCache');
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

          const duplicate = await EventJob.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
            normalizedVenueAddress: normalizedVenue,
            status: { $in: ['confirmed', 'payment_processing', 'setup_in_progress'] },
          }).session(session);

          if (duplicate) {
            await session.abortTransaction();
            throw new ApiError(409, 'This venue is already booked for the selected date.');
          }
        }

        const bookings = await EventJob.create(
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
              aggregateType: 'EventJob',
              eventType: 'BookingInquirySubmitted',
              payload: { bookingId: newBooking._id.toString(), userId },
            },
          ],
          { session },
        );

        await session.commitTransaction();

        try {
          const { emitAdminEvent } = require('../socket');
          emitAdminEvent('booking_update', { bookingId: newBooking._id });
        } catch (socketErr) {
          const logger = require('../config/logger').default;
          logger.debug('Could not emit admin booking_update event:', socketErr);
        }

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

  static async customerSubmitPayment(
    bookingId: string,
    userId: string,
    amount: number,
    transactionId: string,
    note?: string,
  ) {
    const booking = await EventJob.findById(bookingId);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (String(booking.user) !== String(userId))
      throw new ApiError(403, 'Unauthorized transaction action.');

    const paymentAmt = Number(amount) || 0;
    if (paymentAmt <= 0) throw new ApiError(400, 'Invalid payment amount specified.');
    if (!transactionId) throw new ApiError(400, 'Transaction ID is required for verification.');

    const txExists = booking.payments?.some(
      (p: any) => p.transactionId === transactionId && p.status === 'success',
    );
    if (txExists) throw new ApiError(400, 'This transaction ID has already been recorded.');

    try {
      const { RazorpayGateway } = require('../utils/payment/RazorpayGateway');
      const paymentDetails = await RazorpayGateway.getPayment(transactionId);

      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        throw new ApiError(400, `Payment is in ${paymentDetails.status} state, not captured.`);
      }

      const rzpAmount = Number(paymentDetails.amount) / 100;
      if (rzpAmount !== paymentAmt) {
        throw new ApiError(
          400,
          `Payment amount mismatch. Expected ₹${paymentAmt}, found ₹${rzpAmount}`,
        );
      }

      if (paymentDetails.currency !== 'INR') {
        throw new ApiError(400, 'Invalid currency. Expected INR.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, 'Failed to verify transaction ID with payment gateway.');
    }

    booking.payments?.push({
      amount: paymentAmt,
      date: new Date(),
      transactionId: transactionId,
      status: 'success',
      note: note || 'Milestone Deposit Paid',
    });

    const totalPaid = (booking.payments || []).reduce(
      (acc: number, p: any) => acc + (p.status === 'success' ? (p.amount as number) : 0),
      0,
    );
    booking.pricing.pendingBalance = Math.max(0, booking.pricing.totalPrice - totalPaid);

    if (booking.pricing.pendingBalance === 0) {
      booking.pricing.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      booking.pricing.paymentStatus = 'partial';
    } else {
      booking.pricing.paymentStatus = 'unpaid';
    }

    const BookingMessage = require('../models/BookingMessage').default;
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'client',
      message: `LODGED TRANSACTION REF: ${transactionId || 'STUDIO'}. Logged milestone payment of ₹${paymentAmt.toLocaleString('en-IN')}.`,
      timestamp: new Date(),
    });

    await booking.save();
    return booking;
  }

  static async adminUpdateStatus(bookingId: string, status: string, adminId: string) {
    const booking = await EventJob.findById(bookingId).populate('user');
    if (!booking) throw new ApiError(404, 'Booking not found');

    const oldStatus = booking.status;
    const { EventJobStateMachine } = require('../services/eventBooking/EventJobStateMachine');
    EventJobStateMachine.transition(
      booking,
      status as any,
      'Status manually updated by admin',
      adminId,
    );

    if (status === 'confirmed') {
      const bDate = new Date(booking.date);
      const startOfDay = new Date(bDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bDate);
      endOfDay.setHours(23, 59, 59, 999);

      let lockKey = `event_admin_confirm_${booking._id}`;
      if (
        booking.venue?.address &&
        booking.venue.address.trim() &&
        booking.venue.address.toUpperCase() !== 'TBD'
      ) {
        const normalizedVenue = booking.venue.address.trim().toLowerCase().replace(/\s+/g, '_');
        const dateStr = bDate.toISOString().split('T')[0];
        lockKey = `event_booking_${normalizedVenue}_${dateStr}`;
      }

      await DistributedLock.withLock(
        lockKey,
        async () => {
          if (
            booking.venue?.address &&
            booking.venue.address.trim() &&
            booking.venue.address.toUpperCase() !== 'TBD'
          ) {
            const duplicate = await EventJob.findOne({
              _id: { $ne: booking._id },
              date: { $gte: startOfDay, $lte: endOfDay },
              'venue.address': {
                $regex: new RegExp(
                  `^${booking.venue.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                  'i',
                ),
              },
              status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] },
            });

            if (duplicate) {
              throw new ApiError(
                409,
                'Venue is already booked for this date by another confirmed event.',
              );
            }
          }

          const slotsUsed = await EventJob.countDocuments({
            _id: { $ne: booking._id },
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] },
          });

          const MAX_EVENTS_PER_DAY = 3;
          if (slotsUsed >= MAX_EVENTS_PER_DAY) {
            throw new ApiError(
              409,
              'This date has reached the maximum number of concurrent events.',
            );
          }

          await booking.save();
        },
        15,
      );
    } else {
      await booking.save();
    }

    if (status === 'cancelled') {
      const totalPaid = (booking.payments || []).reduce(
        (acc: number, p: any) => acc + (p.status === 'success' ? (p.amount as number) : 0),
        0,
      );
      if (totalPaid > 0) {
        const successfulPayments = (booking.payments || []).filter(
          (p: any) => p.status === 'success',
        );
        const latestPayment = successfulPayments[successfulPayments.length - 1];

        if (latestPayment && latestPayment.transactionId) {
          const { PaymentRefundService } = require('../services/PaymentRefundService');
          await PaymentRefundService.initiateAsyncRefund({
            amount: totalPaid,
            currency: 'INR',
            originalTransactionId: latestPayment.transactionId,
            entityType: 'EventJob',
            entityId: booking._id,
          }).catch((err: any) => {
            const logger = require('../config/logger').default;
            logger.error(
              `[CRITICAL] Failed to enqueue refund for event booking cancellation: ${booking._id}`,
              err,
            );
          });
        }
      }
    }

    const BookingMessage = require('../models/BookingMessage').default;
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'admin',
      message: `STUDIO LOG: Event status transitioned from "${oldStatus.toUpperCase()}" to "${status.toUpperCase()}".`,
      timestamp: new Date(),
    });

    await booking.save();

    try {
      const { emitUserEvent, emitAdminEvent } = require('../socket');
      const userId = (booking.user as any)?._id?.toString() || booking.user?.toString();
      if (userId) {
        emitUserEvent(userId, 'booking_status_updated', {
          bookingId: booking._id,
          bookingRef: booking.bookingId,
          status: booking.status,
          previousStatus: oldStatus,
        });
      }
      emitAdminEvent('booking_update', { bookingId: booking._id });
    } catch (socketErr) {
      const logger = require('../config/logger').default;
      logger.debug('Could not emit booking status socket event:', socketErr);
    }

    try {
      await OutboxEvent.create({
        aggregateId: booking._id.toString(),
        aggregateType: 'EventJob',
        eventType: 'BookingStatusUpdated',
        payload: {
          bookingId: booking._id.toString(),
          userId: (booking.user as any)?._id?.toString() || booking.user?.toString(),
          oldStatus: oldStatus,
          newStatus: status,
        },
      });
    } catch (err: any) {
      const logger = require('../config/logger').default;
      logger.error('Failed to create outbox event for booking status update:', err);
    }

    // Email notification is handled by the outbox processor for EVENTJOB_BOOKINGSTATUSUPDATED

    return booking;
  }

  static async adminUpdateQuotation(bookingId: string, updateData: any) {
    const { eventPackageId, selectedAddons, rentalDurationDays, depositAmountOverride } =
      updateData;
    const booking = await EventJob.findById(bookingId);
    if (!booking) throw new ApiError(404, 'Booking not found');

    if (eventPackageId !== undefined) booking.eventPackage = eventPackageId;
    if (selectedAddons !== undefined) booking.selectedAddons = selectedAddons;
    if (rentalDurationDays !== undefined) booking.rentalDurationDays = rentalDurationDays;

    let basePrice = 25000;
    if (booking.eventPackage) {
      const pkgObj = await Event.findById(booking.eventPackage);
      if (pkgObj) basePrice = pkgObj.basePrice || 35000;
    }

    const durationDays = Number(booking.rentalDurationDays) || 1;
    const durationMultiplier =
      durationDays === 1 ? 1 : durationDays === 2 ? 1.5 : 1.5 + (durationDays - 2) * 0.4;
    basePrice = Math.round(basePrice * durationMultiplier);

    const CANONICAL_ADDONS: Record<string, number> = {
      'Artisanal Wooden Swings / Ooyala': 7500,
      'Gilded Grand Arch Entry Archway': 12000,
      'Live Nadaswaram Instrumental Stage': 15000,
      'Grand Brass Diyas Canopy Set (8 Props)': 9500,
      'Fresh Rose petals pathways carpet (50ft)': 5000,
      'Traditional Handpainted Kolam/Rangoli': 3500,
    };

    const addOnCharges = (booking.selectedAddons || []).reduce((acc: number, item: any) => {
      const canonicalPrice = CANONICAL_ADDONS[item.name as string] || 0;
      item.price = canonicalPrice;
      return acc + canonicalPrice;
    }, 0);

    const total = basePrice + addOnCharges;

    booking.pricing = {
      rentalFee: basePrice,
      setupCharges: 0,
      transportationCost: 0,
      addOnCharges: addOnCharges,
      depositAmount: (Number(depositAmountOverride) || Math.round(total * 0.25)) as number,
      totalPrice: total,
      pendingBalance: Math.max(
        0,
        total -
          (booking.payments || []).reduce(
            (acc: number, p: any) => acc + (p.status === 'success' ? (p.amount as number) : 0),
            0,
          ),
      ),
      paymentStatus: booking.pricing.paymentStatus as any,
    };

    booking.status = 'pending_payment';
    const BookingMessage = require('../models/BookingMessage').default;
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'admin',
      message: `STUDIO PROPOSAL: A refined luxury estimate totaling ₹${total.toLocaleString('en-IN')} has been calculated and dispatched for your final approval.`,
      timestamp: new Date(),
    });

    await booking.save();
    return booking;
  }
}
