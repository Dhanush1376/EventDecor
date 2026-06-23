import { Request, Response } from 'express';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import { EventBookingMailService } from '../services/eventBookingMailService';
import { createAdminNotification } from '../services/notificationService';
import BookingMessage from '../models/BookingMessage';
import { emitUserEvent } from '../socket';
import logger from '../config/logger';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { ADMIN_ROLES } from '../config/adminConfig';
import { EventBookingService } from '../services/eventBookingService';
import { EventBookingStateMachine } from '../services/eventBooking/EventBookingStateMachine';
import { EventBookingCheckoutService } from '../services/eventBooking/EventBookingCheckoutService';
import { DistributedLock } from '../utils/DistributedLock';

// 1. Submit Event Booking Inquiry (Customer)
export const submitEventBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { booking } = await EventBookingService.createBooking(userId as string, req.body);
  res
    .status(201)
    .json(new ApiResponse(true, 'Your luxury event design has been submitted!', booking));
});

// 1.B Initialize Booking Checkout (Secure eCommerce Flow)
export const initializeBookingCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new ApiError(401, 'Authentication credentials missing.');

  const result = await EventBookingCheckoutService.initializeBookingCheckout(userId, req.body);
  res.status(200).json(new ApiResponse(true, 'Booking checkout initialized', result));
});

// 1.C Verify Booking Checkout Payment
export const verifyBookingCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new ApiError(401, 'Authentication credentials missing.');

  const booking = await EventBookingCheckoutService.verifyBookingCheckout(userId, req.body);

  // Send Notifications asynchronously outside transaction
  const eventDateStr = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  } as const);

  createAdminNotification({
    title: 'New Confirmed Event Booking (Paid)',
    message: `A customer paid the advance deposit for "${booking.title}" on ${eventDateStr}.`,
    type: 'payment',
    actionLink: `/admin/bookings`,
    metadata: { bookingId: booking._id.toString() },
  }).catch((err: any) => logger.error('Failed admin notification', err));

  res.status(200).json(new ApiResponse(true, 'Payment successful. Booking confirmed!', booking));
});

// 2. Get Customer Event Bookings
export const getMyEventBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await EventBooking.find({ user: (req as any).user?.id })
    .populate('eventPackage', 'title image') // only get necessary package fields
    .select(
      'bookingId title eventType date status pricing.totalPrice pricing.paymentStatus createdAt',
    )
    .sort({ createdAt: -1 })
    .lean();
  res
    .status(200)
    .json(new ApiResponse(true, 'Your active event curation synced successfully', bookings));
});

// 3. Get Single Event Booking (Client or Admin)
export const getSingleEventBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await EventBooking.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('eventPackage', 'title basePrice image')
    .lean();

  if (!booking) {
    throw new ApiError(404, 'Event details could not be found.');
  }

  // Security bounds checks
  if (
    !ADMIN_ROLES.includes((req as any).user.role as any) &&
    String(booking.user._id || booking.user) !== String((req as any).user.id)
  ) {
    throw new ApiError(403, 'Access denied to this secure design workspace.');
  }

  // Notify customer using the imported BookingMessage
  const messages = await BookingMessage.find({ bookingId: booking._id })
    .sort({ timestamp: 1 })
    .lean();
  (booking as any).chatHistory = messages;

  res.status(200).json(new ApiResponse(true, 'Event workspace fetched', booking));
});

// 4. Client Responds / Approves Quotation
export const customerApproveQuote = asyncHandler(async (req: Request, res: Response) => {
  const { approved } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (String(booking.user) !== String((req as any).user?.id)) {
    throw new ApiError(403, 'Only the client can execute quote responses.');
  }

  // Auto-generate studio welcome note using imported BookingMessage
  booking.clientApproved = approved;
  if (approved) {
    booking.status = 'confirmed';
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'client',
      message:
        'I have approved the custom quotation and setup scope. Let us finalize schedules and milestone deposits!',
      timestamp: new Date(),
    });
  } else {
    booking.status = 'draft' as const;
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'client',
      message:
        'I have requested modifications on the quotation items. Let us discuss color palette adjustments.',
      timestamp: new Date(),
    });
  }

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Quotation response saved', booking));
});

// 5. Customer Submits Payment Milestone
export const customerSubmitPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, transactionId, note } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (String(booking.user) !== String((req as any).user?.id)) {
    throw new ApiError(403, 'Unauthorized transaction action.');
  }

  const paymentAmt = Number(amount) || 0;
  if (paymentAmt <= 0) {
    throw new ApiError(400, 'Invalid payment amount specified.');
  }

  if (!transactionId) {
    throw new ApiError(400, 'Transaction ID is required for verification.');
  }

  // Check if transactionId already exists to prevent replay
  const txExists = booking.payments?.some(
    (p) => p.transactionId === transactionId && p.status === 'success',
  );
  if (txExists) {
    throw new ApiError(400, 'This transaction ID has already been recorded.');
  }

  // Fetch Razorpay payment details to verify authentic transaction
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
        `Payment amount mismatch. Expected â‚¹${paymentAmt}, found â‚¹${rzpAmount}`,
      );
    }

    if (paymentDetails.currency !== 'INR') {
      throw new ApiError(400, 'Invalid currency. Expected INR.');
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'Failed to verify transaction ID with payment gateway.');
  }

  // Log milestone transaction
  booking.payments?.push({
    amount: paymentAmt,
    date: new Date(),
    transactionId: transactionId,
    status: 'success',
    note: note || 'Milestone Deposit Paid',
  });

  // Calculate new balances
  const totalPaid = (booking.payments || []).reduce(
    (acc, p) => acc + (p.status === 'success' ? p.amount : 0),
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

  // Add a system log note using imported BookingMessage
  await BookingMessage.create({
    bookingId: booking._id,
    sender: 'client',
    message: `LODGED TRANSACTION REF: ${transactionId || 'STUDIO'}. Logged milestone payment of â‚¹${paymentAmt.toLocaleString('en-IN')}.`,
    timestamp: new Date(),
  });

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Milestone deposit lodged successfully', booking));
});

// 6. Post Real-Time Studio Chat Message
export const postChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message, attachments } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Workspace not found');
  }

  const isAdmin = ADMIN_ROLES.includes((req as any).user?.role as any);

  if (!isAdmin && String(booking.user) !== String((req as any).user?.id)) {
    throw new ApiError(403, 'Restricted messaging permission.');
  }

  // imported BookingMessage already used
  const msgCount = await BookingMessage.countDocuments({ bookingId: booking._id });
  const MAX_CHAT_MESSAGES = 200;
  if (msgCount >= MAX_CHAT_MESSAGES) {
    throw new ApiError(429, 'Chat history limit reached. Please contact support.');
  }

  await BookingMessage.create({
    bookingId: booking._id,
    sender: isAdmin ? 'admin' : 'client',
    message: message || '',
    timestamp: new Date(),
    attachments: attachments || [],
  });

  const updatedBooking = await EventBooking.findById(booking._id).populate('user').lean();
  const messages = await BookingMessage.find({ bookingId: booking._id })
    .sort({ timestamp: 1 })
    .lean();
  (updatedBooking as any).chatHistory = messages;

  res.status(200).json(new ApiResponse(true, 'Message sent successfully', updatedBooking));
});

// 7. Get All Bookings (Admin Panel Pipeline)
export const adminGetAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const filterQuery: Record<string, unknown> = {};
  if (req.query.status) {
    filterQuery.status = req.query.status;
  }

  if (req.query.search) {
    const searchStr = String(req.query.search).toLowerCase();
    filterQuery.$or = [
      { title: { $regex: searchStr, $options: 'i' } },
      { eventType: { $regex: searchStr, $options: 'i' } },
      { 'venue.address': { $regex: searchStr, $options: 'i' } },
    ];
  }

  const { page, limit, skip } = getPaginationOptions(req.query);

  const [bookings, totalCount] = await Promise.all([
    EventBooking.find(filterQuery)
      .populate('user', 'name email phone')
      .populate('eventPackage', 'title basePrice image')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EventBooking.countDocuments(filterQuery),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Admin bookings catalog aligned',
        formatPaginationResponse(bookings, totalCount, page, limit),
      ),
    );
});

// 8. Admin Timeline Status Shifter
export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const booking = await EventBooking.findById(req.params.id).populate('user');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const oldStatus = booking.status;

  // State Machine Validation via EventBookingStateMachine
  EventBookingStateMachine.transition(
    booking,
    status as any,
    'Status manually updated by admin',
    (req as any).user.id,
  );

  if (status === 'confirmed') {
    // Prevent double booking at the exact moment of admin approval using Distributed Lock
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
        // Re-check overlap inside the lock
        if (
          booking.venue?.address &&
          booking.venue.address.trim() &&
          booking.venue.address.toUpperCase() !== 'TBD'
        ) {
          const duplicate = await EventBooking.findOne({
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

        const slotsUsed = await EventBooking.countDocuments({
          _id: { $ne: booking._id },
          date: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] },
        });

        const MAX_EVENTS_PER_DAY = 3;
        if (slotsUsed >= MAX_EVENTS_PER_DAY) {
          throw new ApiError(409, 'This date has reached the maximum number of concurrent events.');
        }

        await booking.save();
      },
      15,
    );
  } else {
    // For non-confirm transitions, just save
    await booking.save();
  }

  // Handle Refunds on Cancellation
  if (status === 'cancelled') {
    const totalPaid = (booking.payments || []).reduce(
      (acc: number, p: any) => acc + (p.status === 'success' ? (p.amount as number) : 0),
      0,
    );

    if (totalPaid > 0) {
      // Find the most recent successful payment's transactionId
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
          entityType: 'EventBooking',
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

  await BookingMessage.create({
    bookingId: booking._id,
    sender: 'admin',
    message: `STUDIO LOG: Event status transitioned from "${oldStatus.toUpperCase()}" to "${status.toUpperCase()}".`,
    timestamp: new Date(),
  });

  await booking.save();

  try {
    const userId = (booking.user as any)?._id?.toString() || booking.user?.toString();
    if (userId) {
      emitUserEvent(userId, 'booking_status_updated', {
        bookingId: booking._id,
        bookingRef: booking.bookingId,
        status: booking.status,
        previousStatus: oldStatus,
      });
    }
  } catch (socketErr) {
    logger.debug('Could not emit user booking status socket event:', socketErr);
  }

  // Send status update email in background
  EventBookingMailService.sendStatusUpdateEmail(booking, oldStatus, status).catch((err: any) =>
    logger.error('Failed to dispatch status update email to customer:', err),
  );

  res.status(200).json(new ApiResponse(true, 'Timeline status updated', booking));
});

// 9. Admin Refines Quotation Estimates
export const adminUpdateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { eventPackageId, selectedAddons, rentalDurationDays, depositAmountOverride } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

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

  const addOnCharges = (booking.selectedAddons || []).reduce(
    (acc: number, item: Record<string, any>) => {
      const canonicalPrice = CANONICAL_ADDONS[item.name as string] || 0;
      item.price = canonicalPrice;
      return acc + canonicalPrice;
    },
    0,
  );

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
          (acc, p) => acc + (p.status === 'success' ? p.amount : 0),
          0,
        ),
    ),
    paymentStatus: booking.pricing.paymentStatus as any,
  };

  booking.status = 'pending_payment';
  // imported BookingMessage used here
  await BookingMessage.create({
    bookingId: booking._id,
    sender: 'admin',
    message: `STUDIO PROPOSAL: A refined luxury estimate totaling â‚¹${total.toLocaleString('en-IN')} has been calculated and dispatched for your final approval.`,
    timestamp: new Date(),
  });

  await booking.save();
  res
    .status(200)
    .json(new ApiResponse(true, 'Quotation and pricing refined successfully', booking));
});

// 10. Admin Manages Logistics & Setup/Pickup Schedules
export const adminUpdateLogistics = asyncHandler(async (req: Request, res: Response) => {
  const { setupTiming, pickupTiming, assignedTeam, rentedInventory, adminNotes, venue } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (setupTiming) booking.setupTiming = new Date(setupTiming);
  if (pickupTiming) booking.pickupTiming = new Date(pickupTiming);
  if (assignedTeam) booking.assignedTeam = assignedTeam;
  if (rentedInventory) booking.rentedInventory = rentedInventory;
  if (adminNotes !== undefined) booking.adminNotes = adminNotes;
  if (venue) {
    booking.venue = {
      ...booking.venue,
      ...venue,
    };
  }

  await booking.save();
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Logistics, inventory, staff rosters, and venue details allocated',
        booking,
      ),
    );
});

// 11. Admin Internal Notes Logger
export const adminUpdateNotes = asyncHandler(async (req: Request, res: Response) => {
  const { adminNotes } = req.body;
  const booking = await EventBooking.findByIdAndUpdate(
    req.params.id,
    { adminNotes },
    { returnDocument: 'after' },
  );

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  res.status(200).json(new ApiResponse(true, 'Curators operational log notes saved', booking));
});
