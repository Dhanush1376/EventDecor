import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EventJob from '../../models/EventJob';
import { createAdminNotification } from '../../services/notificationService';
import BookingMessage from '../../models/BookingMessage';
import logger from '../../config/logger';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { ADMIN_ROLES } from '../../config/adminConfig';
import { EventBookingManagementService } from '../../services/eventBooking/EventBookingManagementService';
import { EventJobCheckoutService } from '../../services/eventBooking/EventJobCheckoutService';

const resolveMissingPackages = async (bookings: any[]) => {
  const bookingsMissingPackage = bookings.filter(
    (b: any) => (!b.eventPackage || !b.eventPackage.image) && (b.title || b.eventType),
  );
  if (bookingsMissingPackage.length > 0) {
    const Product = require('../../models/Product').default;
    const products = await Product.find({}).select('title imageSrc category').lean();

    const ShowcaseCollection =
      mongoose.models.ShowcaseCollection || require('../../models/ShowcaseCollection').default;
    const showcases = await ShowcaseCollection.find({}).select('title image category').lean();

    const Event = mongoose.models.Event || require('../../models/Event').default;
    const events = await Event.find({}).select('title image category').lean();

    const allPool = [
      ...showcases.map((s: any) => ({ ...s, imageSrc: s.image })),
      ...events.map((e: any) => ({ ...e, imageSrc: e.image })),
      ...products,
    ];

    for (const booking of bookingsMissingPackage) {
      const cleanTitle = (booking.title || '')
        .replace(/^rent:\s*/i, '')
        .replace(/\s*booking$/i, '')
        .replace(/\s*setup$/i, '')
        .trim()
        .toLowerCase();

      // 1. Exact or substring match
      let matchedItem = allPool.find(
        (p: any) =>
          p.title &&
          (p.title.toLowerCase().trim() === cleanTitle ||
            cleanTitle.includes(p.title.toLowerCase()) ||
            p.title.toLowerCase().includes(cleanTitle)),
      );

      // 2. Keyword/token overlap match (if title was edited)
      if (!matchedItem && cleanTitle) {
        const words = cleanTitle.split(/\s+/).filter((w: string) => w.length > 2);
        let bestScore = 0;
        for (const item of allPool) {
          if (!item.title) continue;
          const iTitle = item.title.toLowerCase();
          let score = 0;
          for (const w of words) {
            if (iTitle.includes(w)) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            matchedItem = item;
          }
        }
      }

      // 3. Category / Event Type match
      if (!matchedItem && booking.eventType) {
        const bType = booking.eventType.toLowerCase().replace(/[-_]+/g, ' ').trim();
        matchedItem = allPool.find((item: any) => {
          const cat = (item.category || '').toLowerCase().replace(/[-_]+/g, ' ').trim();
          return (
            cat &&
            (cat === bType || bType.includes(cat) || cat.includes(bType)) &&
            (item.imageSrc || item.image)
          );
        });
      }

      // 4. Fallback to any available showcase/event image
      if (!matchedItem && allPool.length > 0) {
        matchedItem = allPool.find((i: any) => i.imageSrc || i.image) || allPool[0];
      }

      if (matchedItem) {
        const image = matchedItem.imageSrc || matchedItem.image;
        if (image) {
          booking.eventPackage = {
            _id: matchedItem._id,
            title: booking.title || matchedItem.title,
            image: image,
          };
        }
      }
    }
  }
};

// 1. Submit Event Booking Inquiry (Customer)
export const submitEventJob = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { booking } = await EventBookingManagementService.createInquiry(userId as string, req.body);
  res
    .status(201)
    .json(new ApiResponse(true, 'Your luxury event design has been submitted!', booking));
});

// 1.B Initialize Booking Checkout (Secure eCommerce Flow)
export const initializeBookingCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new ApiError(401, 'Authentication credentials missing.');

  const result = await EventJobCheckoutService.initializeBookingCheckout(userId, req.body);
  res.status(200).json(new ApiResponse(true, 'Booking checkout initialized', result));
});

// 1.C Verify Booking Checkout Payment
export const verifyBookingCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new ApiError(401, 'Authentication credentials missing.');

  const booking = await EventJobCheckoutService.verifyBookingCheckout(userId, req.body);

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
    actionLink: `/admin/events/${booking._id}`,
    metadata: { bookingId: booking._id.toString() },
  }).catch((err: any) => logger.error('Failed admin notification', err));

  res.status(200).json(new ApiResponse(true, 'Payment successful. Booking confirmed!', booking));
});

export const getMyEventJobs = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await EventJob.find({ user: (req as any).user?.id })
    .populate('eventPackage', 'title image') // only get necessary package fields
    .select(
      'bookingId title eventType date status pricing.totalPrice pricing.paymentStatus createdAt venue timing eventPackage inspirationImages',
    )
    .sort({ createdAt: -1 })
    .lean();

  await resolveMissingPackages(bookings);

  res
    .status(200)
    .json(new ApiResponse(true, 'Your active event curation synced successfully', bookings));
});

// 3. Get Single Event Booking (Client or Admin)
export const getSingleEventJob = asyncHandler(async (req: Request, res: Response) => {
  const booking = await EventJob.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('eventPackage', 'title basePrice image')
    .lean();

  if (!booking) {
    throw new ApiError(404, 'Event details could not be found.');
  }

  // Fallback for product rentals and showcases
  await resolveMissingPackages([booking]);

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
  const booking = await EventJob.findById(req.params.id);

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

  const booking = await EventBookingManagementService.customerSubmitPayment(
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
  const booking = await EventJob.findById(req.params.id);

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

  const updatedBooking = await EventJob.findById(booking._id).populate('user').lean();
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
    EventJob.find(filterQuery)
      .populate('user', 'name email phone')
      .populate('eventPackage', 'title basePrice image')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EventJob.countDocuments(filterQuery),
  ]);

  await resolveMissingPackages(bookings);

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

  const booking = await EventBookingManagementService.adminUpdateStatus(
    req.params.id as string,
    status,
    adminId,
  );

  res.status(200).json(new ApiResponse(true, 'Timeline status updated', booking));
});

// 9. Admin Refines Quotation Estimates
export const adminUpdateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const booking = await EventBookingManagementService.adminUpdateQuotation(
    req.params.id as string,
    req.body,
  );

  res
    .status(200)
    .json(new ApiResponse(true, 'Quotation and pricing refined successfully', booking));
});

// 10. Admin Manages Logistics & Setup/Pickup Schedules
export const adminUpdateLogistics = asyncHandler(async (req: Request, res: Response) => {
  const {
    date,
    timing,
    setupTiming,
    pickupTiming,
    assignedTeam,
    rentedInventory,
    adminNotes,
    venue,
  } = req.body;
  const booking = await EventJob.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (date) booking.date = new Date(date);
  if (timing) booking.timing = timing;
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
  const booking = await EventJob.findByIdAndUpdate(
    req.params.id,
    { adminNotes },
    { returnDocument: 'after' },
  );

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  res.status(200).json(new ApiResponse(true, 'Curators operational log notes saved', booking));
});

// 12. Initialize Milestone Payment
export const initializeMilestonePayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;
  const userId = (req as any).user?.id;
  const result = await EventJobCheckoutService.initializeMilestonePayment(
    req.params.id as string,
    userId,
    amount,
  );
  res.status(200).json(new ApiResponse(true, 'Milestone payment initialized', result));
});

// 13. Admin Record Offline Payment
export const adminRecordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, transactionId, status, note } = req.body;
  const booking = await EventBookingManagementService.customerSubmitPayment(
    req.params.id as string,
    (req as any).user.id,
    amount,
    transactionId || 'OFFLINE',
    note || 'Admin recorded offline payment',
  );
  if (status === 'success') {
    // If it's recorded as success, force the status
    booking.pricing.paymentStatus = booking.pricing.pendingBalance === 0 ? 'paid' : 'partial';
    await booking.save();
  }
  res.status(200).json(new ApiResponse(true, 'Offline payment recorded', booking));
});

// 14. Admin Delete Payment
export const adminDeletePayment = asyncHandler(async (_req: Request, _res: Response) => {
  // Not fully supported in the new canonical service, but we can do a hacky remove or just return 400 for now.
  throw new ApiError(
    400,
    'Deleting recorded payments is not supported via this API. Issue a refund instead.',
  );
});

// 15. Admin Soft Delete Booking (moves terminal state bookings to Recycle Bin)
export const adminSoftDeleteBooking = asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const booking = await EventJob.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const status = (booking.status || '').toLowerCase();
  const terminalStatuses = ['completed', 'cancelled', 'rejected'];

  if (!terminalStatuses.includes(status)) {
    throw new ApiError(
      400,
      'Only completed, cancelled, or rejected bookings can be moved to the recycle bin',
    );
  }

  await (booking as any).softDelete((req as any).user, 'Deleted by admin');

  const user = (req as any).user;
  if (user && user.role !== 'user') {
    const { AdminAuditService } = require('../../services/AdminAuditService');
    await AdminAuditService.logAction({
      userId: user.id,
      userEmail: user.email,
      action: 'SOFT_DELETE',
      resourceType: 'EventJob',
      resourceId: booking._id.toString(),
      metadata: {
        bookingId: booking.bookingId || booking._id,
        title: booking.title,
        status: booking.status,
      },
    });
  }

  res
    .status(200)
    .json(new ApiResponse(true, 'Booking moved to recycle bin successfully', { id: booking._id }));
});
