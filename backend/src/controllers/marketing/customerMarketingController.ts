import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../../models/User';
import Order from '../../models/Order';
import NotificationLog from '../../models/NotificationLog';
import ConsentPreference from '../../models/ConsentPreference';
import AutomationEnrollment from '../../models/AutomationEnrollment';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';

/**
 * GET /api/v1/marketing/customers
 * Server-side paginated customer marketing directory with rich spend and engagement stats
 */
export const getMarketingCustomers = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    search,
    loyaltyTier,
    hasCart,
    consentedOnly,
    minSpent,
    maxSpent,
  } = req.query;

  const matchQuery: any = {
    role: { $in: ['customer', 'user'] },
  };

  if (search) {
    matchQuery.$or = [
      { name: { $regex: String(search), $options: 'i' } },
      { email: { $regex: String(search), $options: 'i' } },
      { phone: { $regex: String(search), $options: 'i' } },
    ];
  }

  if (loyaltyTier && loyaltyTier !== 'all') {
    matchQuery.loyaltyTier = loyaltyTier;
  }

  if (hasCart === 'true') {
    matchQuery['cart.0'] = { $exists: true };
  } else if (hasCart === 'false') {
    matchQuery.cart = { $size: 0 };
  }

  if (consentedOnly === 'true') {
    matchQuery['notificationPreferences.categories.promotions'] = { $ne: false };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const pipeline: any[] = [
    { $match: matchQuery },
    // Lookup completed orders
    {
      $lookup: {
        from: 'orders',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$user', '$$userId'] },
              orderStatus: { $in: ['Confirmed', 'Processing', 'Delivered', 'Settled'] },
            },
          },
          {
            $project: {
              total: 1,
              createdAt: 1,
            },
          },
        ],
        as: 'completedOrders',
      },
    },
    {
      $addFields: {
        ordersCount: { $size: '$completedOrders' },
        totalSpent: { $sum: '$completedOrders.total' },
        lastOrderDate: { $max: '$completedOrders.createdAt' },
        cartItemsCount: { $size: { $ifNull: ['$cart', []] } },
        marketingEligible: {
          $ne: ['$notificationPreferences.categories.promotions', false],
        },
      },
    },
  ];

  if (minSpent || maxSpent) {
    const spendMatch: any = {};
    if (minSpent) spendMatch.$gte = Number(minSpent);
    if (maxSpent) spendMatch.$lte = Number(maxSpent);
    pipeline.push({ $match: { totalSpent: spendMatch } });
  }

  // Count total matching
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await User.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Sorting & pagination
  pipeline.push(
    { $sort: { totalSpent: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        loyaltyTier: { $ifNull: ['$loyaltyTier', 'Bronze'] },
        ordersCount: 1,
        totalSpent: 1,
        lastOrderDate: 1,
        cartItemsCount: 1,
        marketingEligible: 1,
        lastLogin: 1,
        createdAt: 1,
        walletBalance: { $ifNull: ['$walletBalance', 0] },
        siriCoins: { $ifNull: ['$siriCoins', 0] },
        city: 1,
        addresses: 1,
      },
    },
  );

  const customers = await User.aggregate(pipeline);

  res.status(200).json(
    new ApiResponse(true, 'Marketing customers fetched', {
      customers,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    }),
  );
});

/**
 * GET /api/v1/marketing/customers/:id/activity
 * Complete Customer 360 Marketing Journey timeline
 */
export const getCustomerMarketingJourney = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const isValidId = mongoose.Types.ObjectId.isValid(id);
  let user = isValidId
    ? await User.findById(new mongoose.Types.ObjectId(id)).populate('cart.product').lean()
    : null;
  if (!user) {
    user = await User.findOne({
      $or: [{ email: id }, { phone: id }],
    })
      .populate('cart.product')
      .lean();
  }
  if (!user) throw new ApiError(404, 'Customer not found');

  // 1. Fetch notification logs (campaigns received, opens, clicks)
  const notificationLogs = await NotificationLog.find({
    $or: [{ userId: user._id }, { recipientEmail: (user.email || '').toLowerCase() }],
  })
    .sort({ createdAt: -1 })
    .populate('campaignId', 'title subject category')
    .populate('automationId', 'name triggerType')
    .populate('conversionOrderId', 'total orderStatus createdAt')
    .lean();

  // 2. Fetch automation enrollments
  const enrollments = await AutomationEnrollment.find({
    userId: user._id,
  })
    .sort({ createdAt: -1 })
    .populate('automationId', 'name triggerType')
    .lean();

  // 3. Fetch completed orders
  const orders = await Order.find({
    $or: [{ user: user._id }, { 'shippingAddress.email': user.email }],
  })
    .sort({ createdAt: -1 })
    .select('_id total orderStatus items createdAt couponCode')
    .lean();

  // 4. Fetch visitor consent record
  const consentRecord = await ConsentPreference.findOne({
    $or: [{ userId: user._id }, { consentToken: user.email.toLowerCase() }],
  }).lean();

  // Build unified chronological timeline
  const timeline: any[] = [];

  // User registration
  timeline.push({
    id: `reg_${user._id}`,
    type: 'registration',
    title: 'Customer Account Created',
    description: `Registered with ${user.email}`,
    timestamp: user.createdAt,
    metadata: { role: user.role, loyaltyTier: user.loyaltyTier },
  });

  // Marketing email events
  notificationLogs.forEach((log) => {
    timeline.push({
      id: `email_${log._id}`,
      type: 'email_sent',
      title: log.campaignId
        ? `Campaign: ${(log.campaignId as any).title}`
        : `Lifecycle: ${log.action}`,
      description: `Sent to ${log.recipientEmail} (${log.status})`,
      timestamp: log.createdAt,
      metadata: {
        campaign: log.campaignId,
        automation: log.automationId,
        status: log.status,
      },
    });

    if (log.openedAt) {
      timeline.push({
        id: `open_${log._id}`,
        type: 'email_opened',
        title: 'Email Opened',
        description: `Customer opened email: ${log.campaignId ? (log.campaignId as any).title : log.action}`,
        timestamp: log.openedAt,
        metadata: { logId: log._id },
      });
    }

    if (log.clicks && log.clicks.length > 0) {
      log.clicks.forEach((clk, cIdx) => {
        timeline.push({
          id: `click_${log._id}_${cIdx}`,
          type: 'email_clicked',
          title: 'Link Clicked in Campaign',
          description: `Clicked destination link`,
          timestamp: clk.clickedAt,
          metadata: { url: clk.url },
        });
      });
    }

    if (log.conversionOrderId) {
      timeline.push({
        id: `conv_${log._id}`,
        type: 'conversion',
        title: 'Campaign-Attributed Purchase!',
        description: `Order placed after interacting with campaign. Revenue: ₹${log.revenueAttributed}`,
        timestamp: (log.conversionOrderId as any).createdAt || log.updatedAt,
        metadata: {
          orderId: (log.conversionOrderId as any)._id,
          revenue: log.revenueAttributed,
        },
      });
    }
  });

  // Orders
  orders.forEach((ord) => {
    timeline.push({
      id: `order_${ord._id}`,
      type: 'order_placed',
      title: `Order Placed (₹${ord.total})`,
      description: `Status: ${ord.orderStatus}, Items: ${ord.items?.length || 0}`,
      timestamp: ord.createdAt,
      metadata: { orderId: ord._id, total: ord.total, status: ord.orderStatus },
    });
  });

  // Sort timeline chronologically descending (newest first)
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.status(200).json(
    new ApiResponse(true, 'Customer marketing journey fetched', {
      customer: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        loyaltyTier: user.loyaltyTier || 'Bronze',
        cart: user.cart,
        promotionsSubscribed: user.notificationPreferences?.categories?.promotions !== false,
        createdAt: user.createdAt,
      },
      stats: {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        emailsReceived: notificationLogs.length,
        emailsOpened: notificationLogs.filter((l) => l.openedAt).length,
        linksClicked: notificationLogs.reduce((sum, l) => sum + (l.clicks?.length || 0), 0),
        conversionsAttributed: notificationLogs.filter((l) => l.conversionOrderId).length,
      },
      timeline,
      consentRecord,
      enrollments,
    }),
  );
});
