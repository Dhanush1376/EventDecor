import mongoose from 'mongoose';
import EventBooking from '../../models/EventBooking';
import Event from '../../models/Event';
import User from '../../models/User';
import ApiError from '../../utils/ApiError';
import { generateUniqueBookingId } from '../../utils/bookingId';
import { RazorpayGateway } from '../../utils/payment/RazorpayGateway';
import crypto from 'crypto';
import logger from '../../config/logger';
import BookingMessage from '../../models/BookingMessage';
import { PaymentRefundService } from '../PaymentRefundService';
import OutboxEvent from '../../models/OutboxEvent';
import PaymentAudit from '../../models/PaymentAudit';
import { EventBookingStateMachine } from './EventBookingStateMachine';
import { EventResourcePlanningService } from './EventResourcePlanningService';
import PaymentAttempt from '../../models/PaymentAttempt';

export class EventBookingCheckoutService {
  static async initializeBookingCheckout(userId: string, data: any) {
    const {
      eventPackageId,
      eventType,
      title,
      date,
      rentalDurationDays,
      timing,
      guestCount,
      venue,
      customization,
      selectedAddons,
      inspirationImages,
      idempotencyKey,
    } = data;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found.');

    let basePrice = 25000;
    if (eventPackageId) {
      const pkgObj = await Event.findById(eventPackageId);
      if (pkgObj) basePrice = pkgObj.basePrice || 35000;
    }

    const durationDays = Number(rentalDurationDays) || 1;
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

    const addOnCharges = (selectedAddons || []).reduce((acc: number, item: any) => {
      const canonicalPrice = CANONICAL_ADDONS[item.name] || 0;
      item.price = canonicalPrice;
      return acc + canonicalPrice;
    }, 0);
    const totalPrice = basePrice + addOnCharges;
    const depositAmount = Math.round(totalPrice * 0.5);

    const bookingId = await generateUniqueBookingId();

    const session = await mongoose.startSession();
    session.startTransaction();
    // eslint-disable-next-line unused-imports/no-unused-vars
    let booking;

    try {
      const bDate = new Date(date);
      const startOfDay = new Date(bDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bDate);
      endOfDay.setHours(23, 59, 59, 999);

      const slotsUsed = await EventBooking.countDocuments({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] },
      }).session(session);

      const MAX_EVENTS_PER_DAY = 3;
      if (slotsUsed >= MAX_EVENTS_PER_DAY) {
        throw new ApiError(409, 'This date is fully booked. Please choose another date.');
      }

      // Idempotency check: If an unexpired booking already exists for this key, return it.
      if (idempotencyKey) {
        const existing = await EventBooking.findOne({ idempotencyKey, user: userId }).session(
          session,
        );
        if (existing) {
          if (existing.status !== 'pending_payment' && existing.status !== 'payment_processing') {
            throw new ApiError(
              400,
              `A booking with this idempotency key already exists and is in status: ${existing.status}`,
            );
          }
          await session.abortTransaction();
          session.endSession();
          return {
            bookingId: existing._id,
            razorpayOrderId: existing.razorpayOrderId,
            amount: existing.pricing.depositAmount,
            currency: 'INR',
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
          };
        }
      }

      if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
        const hasTimeOverlap = await EventResourcePlanningService.checkVenueTimeOverlap(
          bDate,
          venue.address,
          timing || { start: '10:00 AM', end: '10:00 PM' },
          '', // No exclude ID on new booking
          session,
        );

        if (hasTimeOverlap) {
          throw new ApiError(
            409,
            'This venue is already booked for an overlapping time slot on the selected date. Please choose another time or date.',
          );
        }
      }

      const bookings = await EventBooking.create(
        [
          {
            _id: new mongoose.Types.ObjectId(),
            bookingId: await generateUniqueBookingId(),
            user: userId,
            eventPackage: eventPackageId || null,
            title: title || `${eventType || 'Special'} Celebration`,
            eventType: eventType || 'Wedding',
            date: bDate,
            rentalDurationDays: durationDays,
            timing: timing || { start: '10:00 AM', end: '10:00 PM' },
            guestCount: parseInt(guestCount) || 100,
            venue: venue || { address: 'TBD', isOutdoor: false },
            customization: customization || {},
            selectedAddons: selectedAddons || [],
            inspirationImages: inspirationImages || [],
            pricing: {
              rentalFee: basePrice,
              setupCharges: 0,
              transportationCost: 0,
              addOnCharges,
              depositAmount,
              totalPrice,
              pendingBalance: totalPrice,
              paymentStatus: 'unpaid',
            },
            payments: [],
            status: 'pending_payment',
            idempotencyKey,
          },
        ],
        { session },
      );

      booking = bookings[0];

      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      if (err.code === 11000)
        throw new ApiError(
          409,
          'This venue is already locked for the selected date. Please choose another date or contact support.',
        );
      throw err;
    } finally {
      session.endSession();
    }

    const pendingOrderId = booking._id;

    const options = {
      amount: depositAmount * 100,
      currency: 'INR',
      receipt: `receipt_${pendingOrderId}`,
      payment_capture: 1,
    };

    let razorpayOrder;
    try {
      const { razorpayCircuitBreaker } = require('../../utils/CircuitBreaker');
      razorpayOrder = await razorpayCircuitBreaker.execute(() =>
        RazorpayGateway.createOrder(options),
      );
    } catch (err: any) {
      logger.error('Razorpay event booking order creation failed:', err);
      throw new ApiError(
        502,
        'Payment gateway temporarily unavailable. Please try again in a few minutes.',
      );
    }

    const attemptData = {
      pendingOrderId,
      bookingId,
      userId,
      eventPackage: eventPackageId || null,
      title: title || `${eventType || 'Special'} Celebration`,
      eventType: eventType || 'Wedding',
      date: new Date(date),
      rentalDurationDays: durationDays,
      timing: timing || { start: '10:00 AM', end: '10:00 PM' },
      guestCount: parseInt(guestCount) || 100,
      venue: venue || { address: 'TBD', isOutdoor: false },
      customization: customization || {},
      selectedAddons: selectedAddons || [],
      inspirationImages: inspirationImages || [],
      basePrice,
      addOnCharges,
      depositAmount,
      totalPrice,
      idempotencyKey,
    };

    await PaymentAttempt.create({
      razorpayOrderId: razorpayOrder.id,
      userId: userId,
      type: 'event_booking',
      status: 'initiated',
      orderData: attemptData,
    });

    return {
      bookingId: pendingOrderId,
      razorpayOrderId: razorpayOrder.id,
      amount: depositAmount,
      currency: 'INR',
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    };
  }

  static async verifyBookingCheckout(userId: string, data: any) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = data;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      throw new ApiError(400, 'Missing payment verification parameters');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let booking: any;
    try {
      booking = await EventBooking.findOneAndUpdate(
        {
          _id: bookingId,
          status: { $in: ['pending_payment', 'failed'] },
        },
        { $set: { status: 'payment_processing' } },
        { returnDocument: 'after', session },
      ).populate('user');

      if (!booking) {
        const existingBooking = await EventBooking.findById(bookingId).session(session);
        if (
          existingBooking &&
          (existingBooking.status === 'confirmed' ||
            existingBooking.status === 'setup_in_progress' ||
            existingBooking.status === 'team_assigned' ||
            existingBooking.status === 'completed')
        ) {
          await session.abortTransaction();
          session.endSession();
          return existingBooking;
        }
        if (existingBooking && existingBooking.status === 'payment_processing') {
          await session.abortTransaction();
          session.endSession();
          // Poll for up to 5 seconds
          for (let i = 0; i < 10; i++) {
            await new Promise((res) => setTimeout(res, 500));
            const checkBooking = await EventBooking.findById(bookingId).populate('user');
            if (
              checkBooking &&
              (checkBooking.status === 'confirmed' ||
                checkBooking.status === 'setup_in_progress' ||
                checkBooking.status === 'team_assigned')
            )
              return checkBooking;
            if (checkBooking && checkBooking.status === 'failed')
              throw new ApiError(400, 'Payment validation failed concurrently');
          }
          throw new ApiError(
            409,
            'Payment is still being processed by our systems. Please check back in a few seconds.',
          );
        }
        throw new ApiError(404, 'Booking not found or cannot be locked for processing');
      }

      if (String(booking.user._id || booking.user) !== String(userId)) {
        booking.status = 'pending_payment';
        await booking.save({ session });
        throw new ApiError(403, 'Unauthorized access to this booking');
      }

      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
        .update(body.toString())
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(razorpaySignature || '', 'utf8');
      const isSignatureValid =
        expectedBuf.length === receivedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, receivedBuf);

      // Cross-check with Razorpay API (enterprise security requirement)

      let fetchedPayment: any = null;
      try {
        fetchedPayment = await RazorpayGateway.getPayment(razorpayPaymentId);
      } catch (err: any) {
        logger.error(
          `[EVENT BOOKING] Failed to fetch payment ${razorpayPaymentId} from Razorpay:`,
          err,
        );
      }

      // Full validation
      let isAmountValid = true;
      let isCurrencyValid = true;
      let isStatusValid = true;
      if (fetchedPayment) {
        const expectedAmount = booking.pricing.depositAmount * 100;
        isAmountValid = fetchedPayment.amount === expectedAmount;
        isCurrencyValid = fetchedPayment.currency === 'INR';
        isStatusValid =
          fetchedPayment.status === 'captured' || fetchedPayment.status === 'authorized';
      }
      const isAuthentic = isSignatureValid && isAmountValid && isCurrencyValid && isStatusValid;

      if (!isAuthentic) {
        // PaymentAudit for failed verification
        await PaymentAudit.create([
          {
            orderId: booking._id,
            userId: userId,
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            eventType: 'verification_attempt',
            status: !isSignatureValid ? 'failed' : 'tampered',
            amountExpected: booking.pricing.depositAmount * 100,
            amountReceived: fetchedPayment ? Number(fetchedPayment.amount) : undefined,
            currencyReceived: fetchedPayment ? String(fetchedPayment.currency) : undefined,
            signatureValid: isSignatureValid,
            notes: `Event booking payment verification failed. Signature: ${isSignatureValid}, Amount: ${isAmountValid}, Status: ${fetchedPayment?.status || 'unknown'}`,
            rawPayload: fetchedPayment ? JSON.stringify(fetchedPayment) : undefined,
          },
        ]);

        try {
          EventBookingStateMachine.transition(
            booking,
            'failed',
            'Payment signature verification failed',
            'system',
          );
          if (booking.payments) {
            booking.payments.push({
              amount: booking.pricing.depositAmount,
              date: new Date(),
              transactionId: razorpayPaymentId,
              status: 'failed',
              note: 'Signature mismatch',
            });
          }
          await booking.save({ session });

          await OutboxEvent.create(
            [
              {
                aggregateId: booking._id.toString(),
                aggregateType: 'EventBooking',
                eventType: 'PaymentFailed',
                payload: { bookingId: booking._id.toString() },
              },
            ],
            { session },
          );

          await session.commitTransaction();
        } catch (failErr) {
          await session.abortTransaction();
          throw failErr;
        }

        session.endSession();
        throw new ApiError(400, 'Payment signature verification failed. Booking marked as failed.');
      }

      // ENTERPRISE FIX: Atomic slot claiming to prevent TOCTOU double-booking
      try {
        await EventResourcePlanningService.claimSlotAtomically(
          new Date(booking.date),
          booking._id.toString(),
          session,
        );
      } catch (err: any) {
        if (err.statusCode === 409) {
          // Max events per day reached concurrently. Need to refund.
          await EventBooking.findByIdAndUpdate(
            booking._id,
            {
              status: 'failed',
              $push: {
                payments: {
                  amount: booking.pricing.depositAmount,
                  date: new Date(),
                  transactionId: razorpayPaymentId,
                  status: 'failed',
                  note: 'Payment successful but date became fully booked concurrently. Refund required.',
                },
              },
            },
            { session },
          );
          await session.commitTransaction();

          await PaymentRefundService.initiateAsyncRefund({
            amount: booking.pricing.depositAmount,
            currency: 'INR',
            originalTransactionId: razorpayPaymentId,
            entityType: 'EventBooking',
            entityId: booking._id,
          }).catch((refundErr: any) =>
            logger.error(
              `[CRITICAL] Failed to enqueue refund for event booking overlap: ${booking._id}`,
              refundErr,
            ),
          );

          throw new ApiError(
            409,
            'Payment was successful, but the date was just fully booked by others. A full refund will be processed within 5-7 business days.',
          );
        }
        throw err;
      }
      const bDate = new Date(booking.date);
      const startOfDay = new Date(bDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bDate);
      endOfDay.setHours(23, 59, 59, 999);

      if (
        booking.venue?.address &&
        booking.venue.address.trim() &&
        booking.venue.address.toUpperCase() !== 'TBD'
      ) {
        const hasTimeOverlap = await EventResourcePlanningService.checkVenueTimeOverlap(
          bDate,
          booking.venue.address,
          booking.timing || { start: '10:00 AM', end: '10:00 PM' },
          booking._id.toString(),
          session,
        );

        if (hasTimeOverlap) {
          await EventBooking.findByIdAndUpdate(
            booking._id,
            {
              status: 'failed',
              $push: {
                payments: {
                  amount: booking.pricing.depositAmount,
                  date: new Date(),
                  transactionId: razorpayPaymentId,
                  status: 'failed',
                  note: 'Payment successful but venue was already booked concurrently for this time slot. Refund required.',
                },
              },
            },
            { session },
          );
          await session.commitTransaction();

          await PaymentRefundService.initiateAsyncRefund({
            amount: booking.pricing.depositAmount,
            currency: 'INR',
            originalTransactionId: razorpayPaymentId,
            entityType: 'EventBooking',
            entityId: booking._id,
          }).catch((err: any) =>
            logger.error(
              `[CRITICAL] Failed to enqueue refund for event venue overlap: ${booking._id}`,
              err,
            ),
          );

          throw new ApiError(
            409,
            'Payment was successful, but the venue was just booked by someone else for your selected time. A full refund will be processed within 5-7 business days.',
          );
        }
      }

      // PaymentAudit for successful verification
      await PaymentAudit.create(
        [
          {
            orderId: booking._id,
            userId: userId,
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            eventType: 'verification_attempt',
            status: 'success',
            amountExpected: booking.pricing.depositAmount * 100,
            amountReceived: fetchedPayment
              ? Number(fetchedPayment.amount)
              : booking.pricing.depositAmount * 100,
            currencyReceived: fetchedPayment ? String(fetchedPayment.currency) : 'INR',
            signatureValid: true,
            notes: `Event booking payment verified successfully`,
            rawPayload: fetchedPayment ? JSON.stringify(fetchedPayment) : undefined,
          },
        ],
        { session },
      );

      EventBookingStateMachine.transition(
        booking,
        'confirmed',
        'Payment verified and booking confirmed',
        userId,
      );
      booking.razorpayPaymentId = razorpayPaymentId;
      booking.razorpaySignature = razorpaySignature;
      booking.clientApproved = true;
      booking.pricing.paymentStatus = 'partial';
      booking.pricing.pendingBalance = booking.pricing.totalPrice - booking.pricing.depositAmount;

      booking.payments?.push({
        amount: booking.pricing.depositAmount,
        date: new Date(),
        transactionId: razorpayPaymentId,
        status: 'success',
        note: 'Initial 50% deposit via Razorpay',
      });

      await BookingMessage.create(
        [
          {
            bookingId: booking._id,
            sender: 'admin',
            message:
              'Payment verified! Your luxury event design is now CONFIRMED. Our artisans will review your floorplans.',
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
            aggregateType: 'EventBooking',
            eventType: 'BookingConfirmed',
            payload: { bookingId: booking._id.toString(), userId },
          },
        ],
        { session },
      );

      await session.commitTransaction();
    } catch (err: any) {
      await session.abortTransaction();
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'An error occurred during booking confirmation');
    } finally {
      session.endSession();
    }

    return booking;
  }
}
