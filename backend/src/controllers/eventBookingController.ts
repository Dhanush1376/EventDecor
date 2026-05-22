import { Request, Response } from 'express';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import User from '../models/User';
import { EventBookingMailService } from '../services/eventBookingMailService';
import { createAdminNotification } from '../services/notificationService';
import logger from '../config/logger';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { generateUniqueBookingId } from '../utils/bookingId';
import { ADMIN_ROLES } from '../config/adminConfig';
import razorpay from '../config/razorpay';
import crypto from 'crypto';

// 1. Submit Event Booking Inquiry (Customer)
export const submitEventBooking = asyncHandler(async (req: any, res: Response) => {
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
  } = req.body;

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Authentication credentials missing or invalid.');
  }

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

  // 1. Double Booking Check (same venue address, same date)
  if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const duplicate = await EventBooking.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      'venue.address': { $regex: new RegExp(`^${venue.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      status: { $nin: ['completed'] }
    });

    if (duplicate) {
      throw new ApiError(409, 'This venue is already booked for the selected date.');
    }
  }

  const bookingId = await generateUniqueBookingId();

  let rentalFee = 0;

  // If client selected an existing package from our catalog, calculate base fee
  if (eventPackageId) {
    const pkg = await Event.findById(eventPackageId);
    if (pkg) {
      // Use the structured basePrice instead of parsing freetext strings
      rentalFee = pkg.basePrice || 35000;
    }
  } else {
    rentalFee = 25000; // base customization fee if guest didn't select package
  }

  const addOnCharges = (selectedAddons || []).reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0);
  const totalPrice = rentalFee + addOnCharges; // initial estimate, setup/transport added later by admin

  const booking = await EventBooking.create({
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
      depositAmount: Math.round(totalPrice * 0.25), // 25% initial milestone deposit
      totalPrice,
      pendingBalance: totalPrice,
      paymentStatus: 'unpaid' as const,
    },
    payments: [],
    status: 'draft' as const,
    assignedTeam: [],
    rentedInventory: [],
    clientApproved: false,
    chatHistory: [
      {
        sender: 'admin' as const,
        message: 'Welcome to your premium Siri Arts Event Studio! Our designers are actively reviewing your floorplans, venue, and Pinterest visual boards.',
        timestamp: new Date(),
      },
    ],
  });

  const eventDateStr = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  } as const);

  // 3. Dispatch persistent real-time admin notification
  createAdminNotification({
    title: 'New Luxury Event Booking Inquiry',
    message: `${user.name || 'A customer'} submitted a new event booking inquiry ("${booking.title}") for ${eventDateStr}.`,
    type: 'custom_request',
    actionLink: `/admin/bookings`,
    metadata: { bookingId: booking._id.toString() }
  }).catch((err: any) => logger.error('Failed to create admin notification for booking:', err));

  // 4. Send elegant emails in background
  EventBookingMailService.sendSubmissionEmails(booking, user).catch((err: any) =>
    logger.error('Failed to dispatch booking emails:', err)
  );

  res.status(201).json(new ApiResponse(true, 'Your luxury event design has been submitted!', booking));
});

// 1.B Initialize Booking Checkout (Secure eCommerce Flow)
export const initializeBookingCheckout = asyncHandler(async (req: any, res: Response) => {
  const { eventPackageId, eventType, title, date, rentalDurationDays, timing, guestCount, venue, customization, selectedAddons, inspirationImages } = req.body;
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Authentication credentials missing.');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');

  if (!razorpay) {
    throw new ApiError(503, 'Payment gateway configuration is missing.');
  }

  // Double Booking Check
  if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const duplicate = await EventBooking.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      'venue.address': { $regex: new RegExp(`^${venue.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      status: { $in: ['confirmed', 'setup_in_progress', 'payment_processing'] }
    });

    if (duplicate) {
      throw new ApiError(409, 'This venue is already locked for the selected date. Please choose another date or contact support.');
    }
  }

  // Calculate strict backend price
  let basePrice = 25000;
  let pkgObj = null;
  if (eventPackageId) {
    pkgObj = await Event.findById(eventPackageId);
    if (pkgObj) {
      basePrice = pkgObj.basePrice || 35000;
    }
  }

  const durationDays = Number(rentalDurationDays) || 1;
  const durationMultiplier = durationDays === 1 ? 1 : durationDays === 2 ? 1.5 : 1.5 + (durationDays - 2) * 0.4;
  basePrice = Math.round(basePrice * durationMultiplier);

  const addOnCharges = (selectedAddons || []).reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0);
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

  // Create Pending Booking
  const bookingId = await generateUniqueBookingId();
  const booking = await EventBooking.create({
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
    chatHistory: [],
  });

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

  booking.chatHistory?.push({
    sender: 'admin',
    message: 'Payment verified! Your luxury event design is now CONFIRMED. Our artisans will review your floorplans.',
    timestamp: new Date(),
  });

  await booking.save();

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
  }).catch(err => logger.error('Failed admin notification', err));

  EventBookingMailService.sendSubmissionEmails(booking, booking.user as any).catch(err =>
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

  booking.clientApproved = approved;
  if (approved) {
    booking.status = 'confirmed';
    booking.chatHistory?.push({
      sender: 'client' as const,
      message: 'I have approved the custom quotation and setup scope. Let us finalize schedules and milestone deposits!',
      timestamp: new Date(),
    });
  } else {
    booking.status = 'draft' as const;
    booking.chatHistory?.push({
      sender: 'client' as const,
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

  booking.chatHistory?.push({
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

  const newMessage = {
    sender: isAdmin ? 'admin' : 'client',
    message: message || '',
    timestamp: new Date(),
    attachments: attachments || [],
  };

  const updatedBooking = await EventBooking.findByIdAndUpdate(
    booking._id,
    {
      $push: {
        chatHistory: {
          $each: [newMessage],
          $slice: -500 // Cap history to last 500 messages
        }
      }
    },
    { new: true }
  );

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
  booking.status = status;

  booking.chatHistory?.push({
    sender: 'admin',
    message: `STUDIO LOG: Event status transitioned from "${oldStatus.toUpperCase()}" to "${status.toUpperCase()}".`,
    timestamp: new Date(),
  });

  await booking.save();

  try {
    const userId = (booking.user as any)?._id?.toString() || booking.user?.toString();
    if (userId) {
      const { emitUserEvent } = require('../socket');
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
  const { rentalFee, setupCharges, transportationCost, addOnCharges, depositAmount } = req.body;
  const booking = await EventBooking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const fee = Number(rentalFee) || 0;
  const setup = Number(setupCharges) || 0;
  const trans = Number(transportationCost) || 0;
  const add = Number(addOnCharges) || 0;
  const total = fee + setup + trans + add;

  booking.pricing = {
    rentalFee: fee,
    setupCharges: setup,
    transportationCost: trans,
    addOnCharges: add,
    depositAmount: (Number(depositAmount) || Math.round(total * 0.25)) as number,
    totalPrice: total,
    pendingBalance: Math.max(0, total - (booking.payments || []).reduce((acc, p) => acc + (p.status === 'success' ? p.amount : 0), 0)),
    paymentStatus: booking.pricing.paymentStatus as any,
  };

  booking.status = 'pending_payment';
  booking.chatHistory?.push({
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
