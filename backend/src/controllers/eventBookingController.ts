import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import User from '../models/User';
import { EventBookingMailService } from '../services/eventBookingMailService';
import { sendDirectEmail, createAdminNotification } from '../services/notificationService';
import BookingMessage from '../models/BookingMessage';
import { emitUserEvent } from '../socket';
import logger from '../config/logger';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { generateUniqueBookingId } from '../utils/bookingId';
import { ADMIN_ROLES } from '../config/adminConfig';
import getRazorpay from '../config/razorpay';
import crypto from 'crypto';
import { EventBookingService } from '../services/eventBookingService';

// 1. Submit Event Booking Inquiry (Customer)
export const submitEventBooking = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { booking } = await EventBookingService.createBooking(userId, req.body);
  res.status(201).json(new ApiResponse(true, 'Your luxury event design has been submitted!', booking));
});

// 1.B Initialize Booking Checkout (Secure eCommerce Flow)
export const initializeBookingCheckout = asyncHandler(async (req: any, res: Response) => {
  const { eventPackageId, eventType, title, date, rentalDurationDays, timing, guestCount, venue, customization, selectedAddons, inspirationImages } = req.body;
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Authentication credentials missing.');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');

  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new ApiError(503, 'Payment gateway configuration is missing.');
  }

  // Calculate strict backend price
  let basePrice = 25000;
  if (eventPackageId) {
    const pkgObj = await Event.findById(eventPackageId);
    if (pkgObj) basePrice = pkgObj.basePrice || 35000;
  }

  const durationDays = Number(rentalDurationDays) || 1;
  const durationMultiplier = durationDays === 1 ? 1 : durationDays === 2 ? 1.5 : 1.5 + (durationDays - 2) * 0.4;
  basePrice = Math.round(basePrice * durationMultiplier);

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
    item.price = canonicalPrice; // Ensure DB saves the canonical price
    return acc + canonicalPrice;
  }, 0);
  const totalPrice = basePrice + addOnCharges;
  const depositAmount = Math.round(totalPrice * 0.50); // 50% strict advance deposit

  // Create Razorpay Order for deposit
  const options = {
    amount: depositAmount * 100, // in paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1,
  };

  const order = await razorpay.orders.create(options);
  const bookingId = await generateUniqueBookingId();

  const session = await mongoose.startSession();
  session.startTransaction();
  let booking;

  try {
    const bDate = new Date(date);
    const startOfDay = new Date(bDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Unconditional Date Overlap Check
    const slotsUsed = await EventBooking.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] }
    }).session(session);

    const MAX_EVENTS_PER_DAY = 3;
    if (slotsUsed >= MAX_EVENTS_PER_DAY) {
      await session.abortTransaction();
      throw new ApiError(409, 'This date is fully booked. Please choose another date.');
    }

    // Double Booking Check (Same venue)
    if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
      const duplicate = await EventBooking.findOne({
        date: { $gte: startOfDay, $lte: endOfDay },
        'venue.address': { $regex: new RegExp(`^${venue.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] }
      }).session(session);

      if (duplicate) {
        await session.abortTransaction();
        throw new ApiError(409, 'This venue is already locked for the selected date. Please choose another date or contact support.');
      }
    }

    const bookings = await EventBooking.create([{
      bookingId,
      user: userId,
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
      razorpayOrderId: order.id,
      assignedTeam: [],
      rentedInventory: [],
      clientApproved: false,
    }], { session });
    
    booking = bookings[0];
    await session.commitTransaction();
  } catch (err: any) {
    await session.abortTransaction();
    if (err.code === 11000) throw new ApiError(409, 'This venue is already locked for the selected date. Please choose another date or contact support.');
    throw err;
  } finally {
    session.endSession();
  }

  res.status(200).json(new ApiResponse(true, 'Booking checkout initialized', {
    bookingId: booking._id,
    razorpayOrderId: order.id,
    amount: depositAmount,
    currency: 'INR',
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
  }));
});

// 1.C Verify Booking Checkout Payment
export const verifyBookingCheckout = asyncHandler(async (req: any, res: Response) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
    throw new ApiError(400, 'Missing payment verification parameters');
  }

  const booking = await EventBooking.findById(bookingId).populate('user');
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (String(booking.user._id || booking.user) !== String(req.user?.id)) {
    throw new ApiError(403, 'Unauthorized access to this booking');
  }

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpaySignature;

  if (!isAuthentic) {
    booking.status = 'failed';
    booking.payments?.push({
      amount: booking.pricing.depositAmount,
      date: new Date(),
      transactionId: razorpayPaymentId,
      status: 'failed',
      note: 'Signature mismatch'
    });
    await booking.save();
    throw new ApiError(400, 'Payment signature verification failed. Booking marked as failed.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bDate = new Date(booking.date);
    const startOfDay = new Date(bDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Unconditional Date Overlap Check
    const slotsUsed = await EventBooking.countDocuments({
      _id: { $ne: booking._id },
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] }
    }).session(session);

    const MAX_EVENTS_PER_DAY = 3;
    if (slotsUsed >= MAX_EVENTS_PER_DAY) {
      await EventBooking.findByIdAndUpdate(booking._id, {
        status: 'failed',
        $push: {
          payments: {
            amount: booking.pricing.depositAmount,
            date: new Date(),
            transactionId: razorpayPaymentId,
            status: 'failed',
            note: 'Payment successful but date became fully booked concurrently. Refund required.'
          }
        }
      }, { session });
      await session.commitTransaction();
      throw new ApiError(409, 'Payment was successful, but the date was just fully booked by others. A full refund will be processed within 5-7 business days.');
    }

    if (booking.venue?.address && booking.venue.address.trim() && booking.venue.address.toUpperCase() !== 'TBD') {
      const duplicate = await EventBooking.findOne({
        _id: { $ne: booking._id },
        date: { $gte: startOfDay, $lte: endOfDay },
        'venue.address': { $regex: new RegExp(`^${booking.venue.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] }
      }).session(session);

      if (duplicate) {
        await EventBooking.findByIdAndUpdate(booking._id, {
          status: 'failed',
          $push: {
            payments: {
              amount: booking.pricing.depositAmount,
              date: new Date(),
              transactionId: razorpayPaymentId,
              status: 'failed',
              note: 'Payment successful but venue was already booked concurrently. Refund required.'
            }
          }
        }, { session });
        await session.commitTransaction();
        throw new ApiError(409, 'Payment was successful, but the venue was just booked by someone else. A full refund will be processed within 5-7 business days.');
      }
    }

    // Update booking as confirmed
    booking.status = 'confirmed';
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
      note: 'Initial 50% deposit via Razorpay'
    });

    await BookingMessage.create([{
      bookingId: booking._id,
      sender: 'admin',
      message: 'Payment verified! Your luxury event design is now CONFIRMED. Our artisans will review your floorplans.',
      timestamp: new Date(),
    }], { session });

    await booking.save({ session });
    await session.commitTransaction();
  } catch (err: any) {
    await session.abortTransaction();
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'An error occurred during booking confirmation');
  } finally {
    session.endSession();
  }

  // Send Notifications
  const eventDateStr = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  } as const);

  createAdminNotification({
    title: 'New Confirmed Event Booking (Paid)',
    message: `A customer paid the advance deposit for "${booking.title}" on ${eventDateStr}.`,
    type: 'payment',
    actionLink: `/admin/bookings`,
    metadata: { bookingId: booking._id.toString() }
  }).catch((err: any) => logger.error('Failed admin notification', err));

  EventBookingMailService.sendSubmissionEmails(booking, booking.user as any).catch((err: any) =>
    logger.error('Failed to dispatch booking emails', err)
  );

  res.status(200).json(new ApiResponse(true, 'Payment successful. Booking confirmed!', booking));
});

// 2. Get Customer Event Bookings
export const getMyEventBookings = asyncHandler(async (req: any, res: Response) => {
  const bookings = await EventBooking.find({ user: req.user?.id })
    .populate('eventPackage', 'title image') // only get necessary package fields
    .select('bookingId title eventType date status pricing.totalPrice pricing.paymentStatus createdAt')
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(new ApiResponse(true, 'Your active event curation synced successfully', bookings));
});

// 3. Get Single Event Booking (Client or Admin)
export const getSingleEventBooking = asyncHandler(async (req: any, res: Response) => {
  const booking = await EventBooking.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('eventPackage')
    .lean();

  if (!booking) {
    throw new ApiError(404, 'Event details could not be found.');
  }

  // Security bounds checks
  if (!ADMIN_ROLES.includes(req.user.role as any) && String(booking.user._id || booking.user) !== String(req.user.id)) {
    throw new ApiError(403, 'Access denied to this secure design workspace.');
  }

    // Notify customer using the imported BookingMessage
  const messages = await BookingMessage.find({ bookingId: booking._id }).sort({ timestamp: 1 }).lean();
  (booking as any).chatHistory = messages;

  res.status(200).json(new ApiResponse(true, 'Event workspace fetched', booking));
});

// 4. Client Responds / Approves Quotation
export const customerApproveQuote = asyncHandler(async (req: any, res: Response) => {
  const { approved } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (String(booking.user) !== String(req.user?.id)) {
    throw new ApiError(403, 'Only the client can execute quote responses.');
  }

  // Auto-generate studio welcome note using imported BookingMessage
  booking.clientApproved = approved;
  if (approved) {
    booking.status = 'confirmed';
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'client',
      message: 'I have approved the custom quotation and setup scope. Let us finalize schedules and milestone deposits!',
      timestamp: new Date(),
    });
  } else {
    booking.status = 'draft' as const;
    await BookingMessage.create({
      bookingId: booking._id,
      sender: 'client',
      message: 'I have requested modifications on the quotation items. Let us discuss color palette adjustments.',
      timestamp: new Date(),
    });
  }

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Quotation response saved', booking));
});

// 5. Customer Submits Payment Milestone Simulation
export const customerSubmitPayment = asyncHandler(async (req: any, res: Response) => {
  const { amount, transactionId, note } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (String(booking.user) !== String(req.user?.id)) {
    throw new ApiError(403, 'Unauthorized transaction action.');
  }

  const paymentAmt = Number(amount) || 0;
  if (paymentAmt <= 0) {
    throw new ApiError(400, 'Invalid payment amount specified.');
  }

  // Log milestone transaction
  booking.payments?.push({
    amount: paymentAmt,
    date: new Date(),
    transactionId: transactionId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    status: 'success',
    note: note || 'Milestone Deposit Paid',
  });

  // Calculate new balances
  const totalPaid = (booking.payments || []).reduce((acc, p) => acc + (p.status === 'success' ? p.amount : 0), 0);
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
    message: `LODGED TRANSACTION REF: ${transactionId || 'STUDIO'}. Logged milestone payment of ₹${paymentAmt.toLocaleString('en-IN')}.`,
    timestamp: new Date(),
  });

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Milestone deposit lodged successfully', booking));
});

// 6. Post Real-Time Studio Chat Message
export const postChatMessage = asyncHandler(async (req: any, res: Response) => {
  const { message, attachments } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Workspace not found');
  }

  const isAdmin = ADMIN_ROLES.includes(req.user?.role as any);

  if (!isAdmin && String(booking.user) !== String(req.user?.id)) {
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
  const messages = await BookingMessage.find({ bookingId: booking._id }).sort({ timestamp: 1 }).lean();
  (updatedBooking as any).chatHistory = messages;

  res.status(200).json(new ApiResponse(true, 'Message sent successfully', updatedBooking));
});

// 7. Get All Bookings (Admin Panel Pipeline)
export const adminGetAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const filterQuery: any = {};
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
      .populate('eventPackage')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EventBooking.countDocuments(filterQuery),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Admin bookings catalog aligned', formatPaginationResponse(bookings, totalCount, page, limit))
  );
});

  // 8. Admin Timeline Status Shifter
export const adminUpdateStatus = asyncHandler(async (req: any, res: Response) => {
  const { status } = req.body;
  const booking = await EventBooking.findById(req.params.id).populate('user');

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const oldStatus = booking.status;
  
  // State Machine Validation
  const validTransitions: Record<string, string[]> = {
    draft: ['pending_payment', 'cancelled'],
    pending_payment: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };

  if (!validTransitions[oldStatus]?.includes(status)) {
    throw new ApiError(400, `Invalid state transition from ${oldStatus} to ${status}`);
  }

  booking.status = status;

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
    logger.error('Failed to dispatch status update email to customer:', err)
  );

  res.status(200).json(new ApiResponse(true, 'Timeline status updated', booking));
});

// 9. Admin Refines Quotation Estimates
export const adminUpdateQuotation = asyncHandler(async (req: any, res: Response) => {
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
  const durationMultiplier = durationDays === 1 ? 1 : durationDays === 2 ? 1.5 : 1.5 + (durationDays - 2) * 0.4;
  basePrice = Math.round(basePrice * durationMultiplier);

  const CANONICAL_ADDONS: Record<string, number> = {
    "Artisanal Wooden Swings / Ooyala": 7500,
    "Gilded Grand Arch Entry Archway": 12000,
    "Live Nadaswaram Instrumental Stage": 15000,
    "Grand Brass Diyas Canopy Set (8 Props)": 9500,
    "Fresh Rose petals pathways carpet (50ft)": 5000,
    "Traditional Handpainted Kolam/Rangoli": 3500,
  };

  const addOnCharges = (booking.selectedAddons || []).reduce((acc: number, item: any) => {
    const canonicalPrice = CANONICAL_ADDONS[item.name] || 0;
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
    pendingBalance: Math.max(0, total - (booking.payments || []).reduce((acc, p) => acc + (p.status === 'success' ? p.amount : 0), 0)),
    paymentStatus: booking.pricing.paymentStatus as any,
  };

  booking.status = 'pending_payment';
  // imported BookingMessage used here
  await BookingMessage.create({
    bookingId: booking._id,
    sender: 'admin',
    message: `STUDIO PROPOSAL: A refined luxury estimate totaling ₹${total.toLocaleString('en-IN')} has been calculated and dispatched for your final approval.`,
    timestamp: new Date(),
  });

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Quotation and pricing refined successfully', booking));
});

// 10. Admin Manages Logistics & Setup/Pickup Schedules
export const adminUpdateLogistics = asyncHandler(async (req: any, res: Response) => {
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
      ...venue
    };
  }

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Logistics, inventory, staff rosters, and venue details allocated', booking));
});

// 11. Admin Internal Notes Logger
export const adminUpdateNotes = asyncHandler(async (req: any, res: Response) => {
  const { adminNotes } = req.body;
  const booking = await EventBooking.findByIdAndUpdate(req.params.id, { adminNotes }, { new: true });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  res.status(200).json(new ApiResponse(true, 'Curators operational log notes saved', booking));
});
