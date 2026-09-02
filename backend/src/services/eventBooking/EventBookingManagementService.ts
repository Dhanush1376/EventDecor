import mongoose from 'mongoose';
import EventJob from '../../domains/event_operations/models/EventJob';
import Event from '../../models/Event';
import User from '../../models/User';
import ApiError from '../../utils/ApiError';
import { generateUniqueBookingId } from '../../utils/bookingId';
import OutboxEvent from '../../models/OutboxEvent';
import BookingMessage from '../../models/BookingMessage';
import { EventJobStateMachine, EventJobStatus } from './EventJobStateMachine';
import { EventResourcePlanningService } from './EventResourcePlanningService';
import { PaymentRefundService } from '../PaymentRefundService';
import { cmsCache } from '../../utils/cache/MemoryCache';
import ContentSection from '../../models/ContentSection';
import { RazorpayGateway } from '../../utils/payment/RazorpayGateway';
import PaymentAudit from '../../models/PaymentAudit';
import logger from '../../config/logger';

export class EventBookingManagementService {
  /**
   * Helper to determine if a status implies resource ownership.
   */
  static isResourceOwningState(status: string): boolean {
    const owningStates = [
      'confirmed',
      'team_assigned',
      'setup_in_progress',
      'execution',
      'completed',
    ];
    return owningStates.includes(status);
  }

  /**
   * Creates a new booking inquiry.
   * This path strictly produces a "draft" booking and does NOT claim capacity.
   */
  static async createInquiry(userId: string, data: any) {
    const {
      eventPackageId,
      title,
      eventType,
      date,
      timing,

      venue,
      customization,
      selectedAddons,
      inspirationImages,
      contactPhone,
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

    const userRecord = user;
    if (contactPhone && !userRecord.phone) {
      userRecord.phone = contactPhone;
      await userRecord.save();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Soft capacity check (do not block entirely, but we can optionally warn)
      // Since it's just an inquiry, we do not claim slots. But we check if the venue is already booked.
      if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
        const hasTimeOverlap = await EventResourcePlanningService.checkVenueTimeOverlap(
          bookingDate,
          venue.address,
          timing || { start: '10:00 AM', end: '10:00 PM' },
          '',
          session,
        );

        if (hasTimeOverlap) {
          throw new ApiError(
            409,
            'This venue is already booked for an overlapping time slot on the selected date. Please choose another time or date.',
          );
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
            date: bookingDate,
            contactPhone: contactPhone || userRecord.phone || '',
            timing: timing || { start: '10:00 AM', end: '10:00 PM' },

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
              paymentStatus: 'unpaid',
            },
            payments: [],
            status: 'draft', // Hardcoded as draft
            assignedTeam: [],
            rentedInventory: [],
            clientApproved: false,
          },
        ],
        { session },
      );

      const newBooking = bookings[0];

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
        const { emitAdminEvent } = require('../../socket');
        emitAdminEvent('booking_update', { bookingId: newBooking._id });
      } catch (socketErr) {
        logger.debug('Could not emit admin booking_update event:', socketErr);
      }

      return { booking: newBooking, user: userRecord };
    } catch (err: any) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Refines a quotation for an existing booking, transitioning it to pending_payment
   */
  static async adminUpdateQuotation(bookingId: string, updateData: any) {
    const { eventPackageId, selectedAddons, rentalDurationDays, depositAmountOverride } =
      updateData;

    const session = await mongoose.startSession();
    session.startTransaction();
    let booking;

    try {
      booking = await EventJob.findById(bookingId).session(session);
      if (!booking) throw new ApiError(404, 'Booking not found');

      if (eventPackageId !== undefined) booking.eventPackage = eventPackageId;
      if (selectedAddons !== undefined) booking.selectedAddons = selectedAddons;
      if (rentalDurationDays !== undefined) booking.rentalDurationDays = rentalDurationDays;

      let basePrice = 25000;
      if (booking.eventPackage) {
        const pkgObj = await Event.findById(booking.eventPackage).session(session);
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
        ...booking.pricing,
        rentalFee: basePrice,
        setupCharges: 0,
        transportationCost: 0, // Legacy
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
      };

      // State Transition check
      EventJobStateMachine.transition(
        booking,
        'pending_payment',
        'Quotation updated and sent to customer',
        'admin',
      );

      await BookingMessage.create(
        [
          {
            bookingId: booking._id,
            sender: 'admin',
            message: `STUDIO PROPOSAL: A refined luxury estimate totaling ₹${total.toLocaleString('en-IN')} has been calculated and dispatched for your final approval.`,
            timestamp: new Date(),
          },
        ],
        { session },
      );

      await booking.save({ session });
      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    return booking;
  }

  /**
   * Manually records a customer milestone payment (for already confirmed/ongoing bookings).
   */
  static async customerSubmitPayment(
    bookingId: string,
    userId: string,
    amount: number,
    transactionId: string,
    note?: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();
    let booking;

    try {
      booking = await EventJob.findById(bookingId).session(session);
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

      // Verify payment with Razorpay
      let paymentDetails;
      try {
        paymentDetails = await RazorpayGateway.getPayment(transactionId);

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

      // Log to PaymentAudit
      await PaymentAudit.create(
        [
          {
            orderId: booking._id,
            userId: userId,
            razorpayOrderId: paymentDetails?.order_id || 'milestone_payment',
            razorpayPaymentId: transactionId,
            eventType: 'verification_attempt',
            status: 'success',
            amountExpected: paymentAmt * 100,
            amountReceived: Number(paymentDetails.amount),
            currencyReceived: 'INR',
            signatureValid: true,
            notes: 'Customer submitted milestone payment successfully',
            rawPayload: JSON.stringify(paymentDetails),
          },
        ],
        { session },
      );

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

      await BookingMessage.create(
        [
          {
            bookingId: booking._id,
            sender: 'client',
            message: `LODGED TRANSACTION REF: ${transactionId || 'STUDIO'}. Logged milestone payment of ₹${paymentAmt.toLocaleString('en-IN')}.`,
            timestamp: new Date(),
          },
        ],
        { session },
      );

      await booking.save({ session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    return booking;
  }

  /**
   * Admin triggers a status update. This enforces proper state transitions
   * and atomic resource slot claiming/releasing.
   */
  static async adminUpdateStatus(bookingId: string, newStatus: string, adminId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    let booking: any;

    try {
      booking = await EventJob.findById(bookingId).populate('user').session(session);
      if (!booking) throw new ApiError(404, 'Booking not found');

      const oldStatus = booking.status as EventJobStatus;
      const targetStatus = newStatus as EventJobStatus;

      // Ensure valid state transition
      EventJobStateMachine.transition(
        booking,
        targetStatus,
        'Status manually updated by admin',
        adminId,
        true, // isAdminOverride
      );

      const currentlyOwnsResource = this.isResourceOwningState(oldStatus);
      const willOwnResource = this.isResourceOwningState(targetStatus);

      // 1. Claim Resource Scenario
      if (!currentlyOwnsResource && willOwnResource) {
        // We must claim a slot for this date.
        // It uses claimSlotAtomically to enforce the hard 3-events-per-day limit.
        try {
          await EventResourcePlanningService.claimSlotAtomically(
            new Date(booking.date),
            booking._id.toString(),
            session,
          );
        } catch (err: any) {
          if (err.statusCode === 409) {
            throw new ApiError(
              409,
              'Cannot confirm booking: This date has reached the maximum number of concurrent events.',
            );
          }
          throw err; // Re-throw other unexpected DB errors
        }

        // We also check for exact venue overlap just to be safe
        if (
          booking.venue?.address &&
          booking.venue.address.trim() &&
          booking.venue.address.toUpperCase() !== 'TBD'
        ) {
          const hasTimeOverlap = await EventResourcePlanningService.checkVenueTimeOverlap(
            new Date(booking.date),
            booking.venue.address,
            booking.timing || { start: '10:00 AM', end: '10:00 PM' },
            booking._id.toString(),
            session,
          );

          if (hasTimeOverlap) {
            throw new ApiError(
              409,
              'Venue is already booked for this time slot by another confirmed event.',
            );
          }
        }
      }

      // 2. Release Resource Scenario
      if (currentlyOwnsResource && !willOwnResource) {
        // e.g. confirmed -> cancelled, setup_in_progress -> failed
        await EventResourcePlanningService.releaseSlotAtomically(
          new Date(booking.date),
          booking._id.toString(),
          session,
        );
      }

      // Refund logic if cancelled
      if (targetStatus === 'cancelled') {
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
            // We initiate this asynchronously (via bullmq) so it doesn't block the transaction,
            // but since we're in a transaction, the outbox pattern is safer.
            // For now, we follow existing behavior but log if it fails.
            await PaymentRefundService.initiateAsyncRefund({
              amount: totalPaid,
              currency: 'INR',
              originalTransactionId: latestPayment.transactionId,
              entityType: 'EventJob',
              entityId: booking._id,
            }).catch((err: any) => {
              logger.error(
                `[CRITICAL] Failed to enqueue refund for event booking cancellation: ${booking._id}`,
                err,
              );
            });
          }
        }
      }

      await BookingMessage.create(
        [
          {
            bookingId: booking._id,
            sender: 'admin',
            message: `STUDIO LOG: Event status transitioned from "${oldStatus.toUpperCase()}" to "${targetStatus.toUpperCase()}".`,
            timestamp: new Date(),
          },
        ],
        { session },
      );

      await booking.save({ session });

      await OutboxEvent.create(
        [
          {
            aggregateId: booking._id.toString(),
            aggregateType: 'EventJob',
            eventType: 'BookingStatusUpdated',
            payload: {
              bookingId: booking._id.toString(),
              userId: (booking.user as any)?._id?.toString() || booking.user?.toString(),
              oldStatus: oldStatus,
              newStatus: targetStatus,
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();

      // Fire sockets after successful commit
      try {
        const { emitUserEvent, emitAdminEvent } = require('../../socket');
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
        logger.debug('Could not emit booking status socket event:', socketErr);
      }
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    return booking;
  }
}
