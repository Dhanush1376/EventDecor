import { Request, Response } from 'express';
import EmailCampaign from '../../models/EmailCampaign';
import MarketingAutomation from '../../models/MarketingAutomation';
import NotificationLog from '../../models/NotificationLog';
import User from '../../models/User';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import AudienceResolverService from '../../services/marketing/AudienceResolverService';
import CampaignExecutionService from '../../services/marketing/CampaignExecutionService';
import EmailBlockRenderer from '../../services/marketing/EmailBlockRenderer';
import { EmailProviderAbstraction } from '../../services/marketing/EmailProviderAbstraction';
import { AdminAuditService } from '../../services/AdminAuditService';
import logger from '../../config/logger';

/**
 * GET /api/v1/marketing/overview
 * Real-time marketing hub KPI dashboard and performance trends
 */
export const getMarketingOverview = asyncHandler(async (_req: Request, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalCustomers,
    subscribedCustomers,
    activeAutomations,
    campaignsAggregate,
    automationStatsAggregate,
    dailyTrends,
    topCampaigns,
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['customer', 'user'] } }),
    User.countDocuments({
      role: { $in: ['customer', 'user'] },
      'notificationPreferences.categories.promotions': { $ne: false },
    }),
    MarketingAutomation.countDocuments({ status: 'active' }),
    EmailCampaign.aggregate([
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          sentCampaigns: {
            $sum: { $cond: [{ $in: ['$status', ['sent', 'partially_sent']] }, 1, 0] },
          },
          totalSent: { $sum: '$stats.sentCount' },
          totalDelivered: { $sum: '$stats.deliveredCount' },
          totalOpened: { $sum: '$stats.openCount' },
          totalClicked: { $sum: '$stats.clickCount' },
          totalOrders: { $sum: '$stats.ordersCount' },
          totalRevenue: { $sum: '$stats.revenueGenerated' },
        },
      },
    ]),
    MarketingAutomation.aggregate([
      {
        $group: {
          _id: null,
          totalTriggered: { $sum: '$stats.triggeredCount' },
          totalSent: { $sum: '$stats.sentCount' },
          totalConverted: { $sum: '$stats.convertedCount' },
          totalRecovered: { $sum: '$stats.revenueRecovered' },
        },
      },
    ]),
    NotificationLog.aggregate([
      {
        $match: {
          type: 'marketing',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          sent: {
            $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read', 'clicked']] }, 1, 0] },
          },
          opened: { $sum: { $cond: [{ $ifNull: ['$openedAt', false] }, 1, 0] } },
          clicked: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$clicks', []] } }, 0] }, 1, 0] },
          },
          conversions: { $sum: { $cond: [{ $ifNull: ['$conversionOrderId', false] }, 1, 0] } },
          revenue: { $sum: { $ifNull: ['$revenueAttributed', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    EmailCampaign.find({ status: { $in: ['sent', 'partially_sent', 'sending'] } })
      .sort({ 'stats.revenueGenerated': -1, createdAt: -1 })
      .limit(5)
      .select('title subject category stats sentAt createdAt status')
      .lean(),
  ]);

  const campStats = campaignsAggregate[0] || {
    totalCampaigns: 0,
    sentCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalOrders: 0,
    totalRevenue: 0,
  };

  const autoStats = automationStatsAggregate[0] || {
    totalTriggered: 0,
    totalSent: 0,
    totalConverted: 0,
    totalRecovered: 0,
  };

  const totalDelivered = campStats.totalDelivered + autoStats.totalSent;
  const deliveryRate =
    campStats.totalSent > 0
      ? ((campStats.totalDelivered / campStats.totalSent) * 100).toFixed(1)
      : '100.0';
  const openRate =
    campStats.totalDelivered > 0
      ? ((campStats.totalOpened / campStats.totalDelivered) * 100).toFixed(1)
      : '0.0';
  const clickRate =
    campStats.totalDelivered > 0
      ? ((campStats.totalClicked / campStats.totalDelivered) * 100).toFixed(1)
      : '0.0';
  const conversionRate =
    campStats.totalDelivered > 0
      ? ((campStats.totalOrders / campStats.totalDelivered) * 100).toFixed(1)
      : '0.0';

  res.status(200).json(
    new ApiResponse(true, 'Marketing overview fetched', {
      kpis: {
        totalCustomers,
        subscribedCustomers,
        subscriptionRate:
          totalCustomers > 0 ? ((subscribedCustomers / totalCustomers) * 100).toFixed(1) : '0.0',
        activeAutomations,
        campaignsSent: campStats.sentCampaigns,
        emailsDelivered: totalDelivered,
        deliveryRate: `${deliveryRate}%`,
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
        conversionRate: `${conversionRate}%`,
        totalRevenueGenerated: campStats.totalRevenue,
        cartRecoveryRevenue: autoStats.totalRecovered,
        combinedRevenue: campStats.totalRevenue + autoStats.totalRecovered,
      },
      dailyTrends,
      topCampaigns,
      automationsSummary: {
        activeCount: activeAutomations,
        totalTriggered: autoStats.totalTriggered,
        totalSent: autoStats.totalSent,
        totalConverted: autoStats.totalConverted,
        totalRecovered: autoStats.totalRecovered,
      },
      recommendations: await AudienceResolverService.getSmartRecommendations(),
      providerStatus: EmailProviderAbstraction.getStatus(),
    }),
  );
});

/**
 * GET /api/v1/marketing/campaigns
 * Paginated list of campaigns with search, status & category filters
 */
export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, status, category, campaignType } = req.query;
  const query: any = { isDeleted: false };

  if (search) {
    query.$or = [
      { title: { $regex: String(search), $options: 'i' } },
      { subject: { $regex: String(search), $options: 'i' } },
    ];
  }
  if (status && status !== 'all') {
    query.status = status;
  }
  if (category && category !== 'all') {
    query.category = category;
  }
  if (campaignType && campaignType !== 'all') {
    query.campaignType = campaignType;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [campaigns, total] = await Promise.all([
    EmailCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('templateId', 'name')
      .populate('createdBy', 'name email')
      .lean(),
    EmailCampaign.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Campaigns retrieved', {
      campaigns,
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
 * GET /api/v1/marketing/campaigns/:id
 * Campaign detail, live stats, timeline, recipient logs, and rendered preview
 */
export const getCampaignById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await EmailCampaign.findById(id)
    .populate('templateId')
    .populate('createdBy', 'name email')
    .lean();

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  // Fetch paginated recipient delivery logs
  const { recipientStatus, search, page = 1, limit = 20 } = req.query;
  const logQuery: any = { campaignId: campaign._id };

  if (recipientStatus && recipientStatus !== 'all') {
    if (recipientStatus === 'opened') {
      logQuery.openedAt = { $exists: true, $ne: null };
    } else if (recipientStatus === 'clicked') {
      logQuery['clicks.0'] = { $exists: true };
    } else if (recipientStatus === 'converted') {
      logQuery.conversionOrderId = { $exists: true, $ne: null };
    } else {
      logQuery.status = recipientStatus;
    }
  }

  if (search) {
    logQuery.recipientEmail = { $regex: String(search), $options: 'i' };
  }

  const logSkip = (Number(page) - 1) * Number(limit);
  const [recipientLogs, logTotal] = await Promise.all([
    NotificationLog.find(logQuery)
      .sort({ createdAt: -1 })
      .skip(logSkip)
      .limit(Number(limit))
      .populate('userId', 'name loyaltyTier')
      .lean(),
    NotificationLog.countDocuments(logQuery),
  ]);

  // Render preview HTML
  const previewHtml = await EmailBlockRenderer.renderFullEmail(
    campaign.designBlocks || [],
    {
      customer: {
        name: 'Rahul Sharma',
        firstName: 'Rahul',
        email: 'rahul.preview@example.com',
        totalSpent: 4500,
        totalOrders: 3,
        loyaltyTier: 'Gold',
      },
      campaign: {
        id: campaign._id.toString(),
        title: campaign.title,
      },
      previewMode: true,
    },
    campaign.customHtml,
  );

  res.status(200).json(
    new ApiResponse(true, 'Campaign details retrieved', {
      campaign,
      recipientLogs,
      previewHtml,
      pagination: {
        total: logTotal,
        page: Number(page),
        pages: Math.ceil(logTotal / Number(limit)),
      },
    }),
  );
});

/**
 * POST /api/v1/marketing/campaigns
 * Create a new campaign
 */
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  const {
    title,
    subject,
    previewText,
    senderName,
    senderEmail,
    replyTo,
    campaignType = 'one_time',
    category = 'promotional',
    designBlocks = [],
    customHtml,
    audienceCriteria = { type: 'all' },
    frequencyGuard,
    scheduledAt,
  } = req.body;

  if (!title || !subject) {
    throw new ApiError(400, 'Campaign title and subject are required');
  }

  const campaign = new EmailCampaign({
    title,
    subject,
    previewText,
    senderName,
    senderEmail,
    replyTo,
    campaignType,
    category,
    designBlocks,
    customHtml,
    audienceCriteria,
    frequencyGuard,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    status: scheduledAt ? 'scheduled' : 'draft',
    createdBy: adminUser?._id,
  });

  await campaign.save();

  // Audit log
  AdminAuditService.logAction({
    actorId: adminUser?._id?.toString(),
    actorEmail: adminUser?.email,
    actorRole: adminUser?.role,
    entityType: 'EmailCampaign',
    entityId: campaign._id.toString(),
    action: 'CREATE',
    newValue: { title, subject, category },
  }).catch(() => {});

  res.status(201).json(new ApiResponse(true, 'Campaign created successfully', campaign));
});

/**
 * PATCH /api/v1/marketing/campaigns/:id
 * Update campaign details, blocks, or audience
 */
export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUser = (req as any).user;
  const campaign = await EmailCampaign.findById(id);

  if (!campaign) throw new ApiError(404, 'Campaign not found');
  if (campaign.status === 'sending' || campaign.status === 'sent') {
    throw new ApiError(400, 'Cannot edit campaign that is actively sending or already sent');
  }

  const previousValue = {
    title: campaign.title,
    subject: campaign.subject,
    status: campaign.status,
  };

  const allowedFields = [
    'title',
    'subject',
    'previewText',
    'senderName',
    'senderEmail',
    'replyTo',
    'category',
    'designBlocks',
    'customHtml',
    'audienceCriteria',
    'frequencyGuard',
    'scheduledAt',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (campaign as any)[field] = req.body[field];
    }
  }

  if (req.body.scheduledAt) {
    campaign.status = 'scheduled';
    campaign.scheduledAt = new Date(req.body.scheduledAt);
  }

  await campaign.save();

  AdminAuditService.logAction({
    actorId: adminUser?._id?.toString(),
    actorEmail: adminUser?.email,
    actorRole: adminUser?.role,
    entityType: 'EmailCampaign',
    entityId: campaign._id.toString(),
    action: 'UPDATE',
    previousValue,
    newValue: { title: campaign.title, subject: campaign.subject, status: campaign.status },
  }).catch(() => {});

  res.status(200).json(new ApiResponse(true, 'Campaign updated successfully', campaign));
});

/**
 * DELETE /api/v1/marketing/campaigns/:id
 */
export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await EmailCampaign.findById(id);
  if (!campaign) throw new ApiError(404, 'Campaign not found');

  if (campaign.status === 'sending') {
    throw new ApiError(400, 'Cannot delete campaign that is actively sending');
  }

  await campaign.softDelete();
  res.status(200).json(new ApiResponse(true, 'Campaign deleted successfully'));
});

/**
 * POST /api/v1/marketing/campaigns/:id/send
 * Instantly triggers background queue broadcast
 */
export const sendCampaignNow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await EmailCampaign.findById(id);
  if (!campaign) throw new ApiError(404, 'Campaign not found');

  const validation = await CampaignExecutionService.validateCampaign(campaign);
  if (!validation.valid) {
    throw new ApiError(400, validation.errors.join(' '));
  }

  // Trigger dispatch in background (non-blocking)
  CampaignExecutionService.executeCampaignDispatch(campaign._id.toString()).catch((err) => {
    logger.error(`[sendCampaignNow] Background error: ${err.message}`);
  });

  res.status(200).json(new ApiResponse(true, 'Campaign broadcast started in background'));
});

/**
 * POST /api/v1/marketing/campaigns/:id/schedule
 */
export const scheduleCampaign = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { scheduledAt } = req.body;
  if (!scheduledAt) throw new ApiError(400, 'scheduledAt date is required');

  const campaign = await CampaignExecutionService.scheduleCampaign(id, new Date(scheduledAt));
  res.status(200).json(new ApiResponse(true, 'Campaign scheduled successfully', campaign));
});

/**
 * POST /api/v1/marketing/campaigns/:id/pause
 */
export const pauseCampaign = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const campaign = await CampaignExecutionService.pauseCampaign(id);
  res.status(200).json(new ApiResponse(true, 'Campaign paused', campaign));
});

/**
 * POST /api/v1/marketing/campaigns/:id/resume
 */
export const resumeCampaign = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const campaign = await CampaignExecutionService.resumeCampaign(id);
  res.status(200).json(new ApiResponse(true, 'Campaign resumed', campaign));
});

/**
 * POST /api/v1/marketing/campaigns/:id/duplicate
 */
export const duplicateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const adminId = (req as any).user?._id?.toString();
  const duplicated = await CampaignExecutionService.duplicateCampaign(id, adminId);
  res.status(201).json(new ApiResponse(true, 'Campaign duplicated successfully', duplicated));
});

/**
 * POST /api/v1/marketing/campaigns/test
 * Diagnostic test email send with rendered blocks
 */
export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  const { to, subject, designBlocks, customHtml, senderName, senderEmail, customerId } = req.body;

  if (!to) throw new ApiError(400, 'Test recipient email is required');
  if (!subject) throw new ApiError(400, 'Subject line is required');

  // If customerId is provided, pull real customer details for test interpolation
  let customerContext: any = {
    name: 'Test Customer',
    firstName: 'Test',
    email: to,
    totalSpent: 3500,
    totalOrders: 2,
    loyaltyTier: 'Silver',
  };

  if (customerId) {
    const realUser = await User.findById(customerId).lean();
    if (realUser) {
      customerContext = {
        name: realUser.name || 'Test Customer',
        firstName: (realUser.name || 'Test Customer').split(' ')[0],
        email: realUser.email,
        loyaltyTier: realUser.loyaltyTier || 'Bronze',
      };
    }
  }

  const renderedHtml = await EmailBlockRenderer.renderFullEmail(
    designBlocks || [],
    {
      customer: customerContext,
      campaign: {
        title: subject,
      },
      previewMode: true,
    },
    customHtml,
  );

  const result = await EmailProviderAbstraction.sendTestEmail({
    to,
    subject,
    html: renderedHtml,
    senderName,
    senderEmail,
  });

  if (!result.success) {
    throw new ApiError(500, `Test email delivery failed: ${result.error}`);
  }

  res.status(200).json(new ApiResponse(true, 'Test email delivered successfully', result));
});

/**
 * POST /api/v1/marketing/audience/estimate
 * Calculates real-time matching recipient count for any dynamic filter rules or segment
 */
export const estimateAudience = asyncHandler(async (req: Request, res: Response) => {
  const criteria = req.body || {};
  const result = await AudienceResolverService.countAudience(criteria);
  res.status(200).json(new ApiResponse(true, 'Audience estimated', result));
});
