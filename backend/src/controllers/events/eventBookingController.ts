import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EventBooking from '../../models/EventBooking';
import { createAdminNotification } from '../../services/notificationService';
import BookingMessage from '../../models/BookingMessage';
import logger from '../../config/logger';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { ADMIN_ROLES } from '../../config/adminConfig';
import { EventBookingService } from '../../services/eventBookingService';
import { EventBookingCheckoutService } from '../../services/eventBooking/EventBookingCheckoutService';

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

export const getMyEventBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await EventBooking.find({ user: (req as any).user?.id })
    .populate('eventPackage', 'title image') // only get necessary package fields
    .select(
      'bookingId title eventType date status pricing.totalPrice pricing.paymentStatus createdAt venue timing eventPackage inspirationImages',
    )
    .sort({ createdAt: -1 })
    .lean();

  // If a booking is actually a rental for a product, eventPackage will be null (due to ref mismatch).
  // Batch-load product images instead of querying in a loop (N+1 fix).
  const Product = require('../../models/Product').default;
  const bookingsMissingPackage = bookings.filter((b: any) => !b.eventPackage && b.title);
  if (bookingsMissingPackage.length > 0) {
    const products = await Product.find({}).select('title imageSrc').lean();

    // Also include ShowcaseCollection and Event models for fallback
    const ShowcaseCollection =
      mongoose.models.ShowcaseCollection || require('../../models/ShowcaseCollection').default;
    const showcases = await ShowcaseCollection.find({}).select('title image').lean();
    const Event = mongoose.models.Event || require('../../models/Event').default;
    const events = await Event.find({}).select('title image').lean();

    logger.info(
      `[DEBUG] Found products: ${products.length}, showcases: ${showcases.length}, events: ${events.length}. Missing package bookings: ${bookingsMissingPackage.length}`,
    );

    for (const booking of bookingsMissingPackage) {
      const cleanTitle = (booking as any).title
        .replace(/^rent:\s*/i, '')
        .replace(/\s*booking$/i, '')
        .trim()
        .toLowerCase();

      logger.info(
        `[DEBUG] Trying to match cleanTitle: "${cleanTitle}" from original title: "${(booking as any).title}"`,
      );

      let matchedItem = products.find((p: any) => p.title.toLowerCase().trim() === cleanTitle);

      if (!matchedItem) {
        matchedItem = products.find(
          (p: any) =>
            p.title.toLowerCase().includes(cleanTitle) ||
            cleanTitle.includes(p.title.toLowerCase()),
        );
      }

      // If not in products, check showcases
      if (!matchedItem) {
        matchedItem = showcases.find((s: any) => s.title.toLowerCase().trim() === cleanTitle);
        if (!matchedItem) {
          matchedItem = showcases.find(
            (s: any) =>
              s.title.toLowerCase().includes(cleanTitle) ||
              cleanTitle.includes(s.title.toLowerCase()),
          );
        }
      }

      // If not in showcases, check events
      if (!matchedItem) {
        matchedItem = events.find((e: any) => e.title.toLowerCase().trim() === cleanTitle);
        if (!matchedItem) {
          matchedItem = events.find(
            (e: any) =>
              e.title.toLowerCase().includes(cleanTitle) ||
              cleanTitle.includes(e.title.toLowerCase()),
          );
        }
      }

      logger.info(
        `[DEBUG] Matched item for "${cleanTitle}": ${matchedItem ? matchedItem.title : 'NONE'}`,
      );

      if (matchedItem) {
        const image = matchedItem.imageSrc || matchedItem.image;
        if (image) {
          (booking as any).eventPackage = {
            _id: matchedItem._id,
            title: (booking as any).title,
            image: image,
          };
        }
      }
    }
  }

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

  // Fallback for product rentals
  if (!booking.eventPackage && booking.title) {
    const Product = require('../../models/Product').default;
    const cleanTitle = booking.title
      .replace(/^rent:\s*/i, '')
      .replace(/\s*booking$/i, '')
      .trim();
    const titleRegex = new RegExp(
      `^${cleanTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`,
      'i',
    );
    const product = await Product.findOne({ title: titleRegex })
      .select('imageSrc basePrice')
      .lean();
    if (product && product.imageSrc) {
      booking.eventPackage = {
        _id: product._id,
        title: booking.title,
        basePrice: product.price,
        image: product.imageSrc,
      } as any;
    }
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
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication credentials missing.');
  }

  const booking = await EventBookingService.customerSubmitPayment(
    req.params.id as string,
    userId,
    amount,
    transactionId,
    note,
  );

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
  const adminId = (req as any).user.id;

  const booking = await EventBookingService.adminUpdateStatus(
    req.params.id as string,
    status,
    adminId,
  );

  res.status(200).json(new ApiResponse(true, 'Timeline status updated', booking));
});

// 9. Admin Refines Quotation Estimates
export const adminUpdateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const booking = await EventBookingService.adminUpdateQuotation(req.params.id as string, req.body);

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
