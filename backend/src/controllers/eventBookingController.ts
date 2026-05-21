import { Request, Response } from 'express';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import User from '../models/User';
import { EventBookingMailService } from '../services/eventBookingMailService';
import { createAdminNotification } from './adminNotificationController';
import logger from '../config/logger';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { generateUniqueBookingId } from '../utils/bookingId';

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

  // 1. Double Booking Check (same venue address, same date)
  if (venue?.address && venue.address.trim() && venue.address.toUpperCase() !== 'TBD') {
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const duplicate = await EventBooking.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      'venue.address': { $regex: new RegExp(`^${venue.address.trim()}$`, 'i') },
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
      // Parse pricing string like "Starting at ₹75,000" or similar
      const rawPrice = pkg.pricing ? pkg.pricing.replace(/[^0-9]/g, '') : '0';
      rentalFee = parseInt(rawPrice) || 35000; // default fallback if unparseable
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
      paymentStatus: 'unpaid',
    },
    payments: [],
    status: 'inquiry',
    assignedTeam: [],
    rentedInventory: [],
    clientApproved: false,
    chatHistory: [
      {
        sender: 'admin',
        message: 'Welcome to your premium Siri Arts Event Studio! Our designers are actively reviewing your floorplans, venue, and Pinterest visual boards.',
        timestamp: new Date(),
      },
    ],
  });

  const eventDateStr = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // 3. Dispatch persistent real-time admin notification
  createAdminNotification({
    title: 'New Luxury Event Booking Inquiry',
    message: `${user.name || 'A customer'} submitted a new event booking inquiry ("${booking.title}") for ${eventDateStr}.`,
    type: 'custom_request',
    actionLink: `/admin/bookings`,
    metadata: { bookingId: booking._id }
  }).catch((err: any) => logger.error('Failed to create admin notification for booking:', err));

  // 4. Send elegant emails in background
  EventBookingMailService.sendSubmissionEmails(booking, user).catch((err: any) =>
    logger.error('Failed to dispatch booking emails:', err)
  );

  res.status(201).json(new ApiResponse(true, 'Your luxury event design has been submitted!', booking));
});

// 2. Get Customer Event Bookings
export const getMyEventBookings = asyncHandler(async (req: any, res: Response) => {
  const bookings = await EventBooking.find({ user: req.user?.id })
    .populate('eventPackage')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(true, 'Your active event curation synced successfully', bookings));
});

// 3. Get Single Event Booking (Client or Admin)
export const getSingleEventBooking = asyncHandler(async (req: any, res: Response) => {
  const booking = await EventBooking.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('eventPackage');

  if (!booking) {
    throw new ApiError(404, 'Event details could not be found.');
  }

  // Security bounds checks
  if (req.user.role !== 'admin' && String(booking.user._id || booking.user) !== String(req.user.id)) {
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
      sender: 'client',
      message: 'I have approved the custom quotation and setup scope. Let us finalize schedules and milestone deposits!',
      timestamp: new Date(),
    });
  } else {
    booking.status = 'discussion';
    booking.chatHistory?.push({
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

  const isAdmin = req.user?.role === 'admin';

  if (!isAdmin && String(booking.user) !== String(req.user?.id)) {
    throw new ApiError(403, 'Restricted messaging permission.');
  }

  booking.chatHistory?.push({
    sender: isAdmin ? 'admin' : 'client',
    message: message || '',
    timestamp: new Date(),
    attachments: attachments || [],
  });

  await booking.save();
  res.status(200).json(new ApiResponse(true, 'Message sent successfully', booking));
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
      .limit(limit),
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
    depositAmount: Number(depositAmount) || Math.round(total * 0.25),
    totalPrice: total,
    pendingBalance: Math.max(0, total - (booking.payments || []).reduce((acc, p) => acc + (p.status === 'success' ? p.amount : 0), 0)),
    paymentStatus: booking.pricing.paymentStatus,
  };

  booking.status = 'quotation_sent';
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
