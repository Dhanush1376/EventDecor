import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import ConsentPreference from '../models/ConsentPreference';
import NotificationLog from '../models/NotificationLog';
import EmailCampaign from '../models/EmailCampaign';
import EmailTemplate from '../models/EmailTemplate';
import User from '../models/User';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { runCampaignDispatch } from '../services/notificationService';
import logger from '../config/logger';
import { getFrontendUrl } from '../utils/getFrontendUrl';

// A transparent 1x1 pixel image GIF buffer for email open tracking
const transparentGif = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

/**
 * Capture and persist visitor cookie and notification preferences (GDPR/EPrivacy style)
 */
export const saveConsentPreference = asyncHandler(async (req: Request, res: Response) => {
  const {
    consentToken,
    cookies,
    marketingEmails,
    updateNotifications,
    personalizedRecommendations,
  } = req.body;
  const userId = (req as any).user?.id; // Optional authenticated user

  let token = consentToken;
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
  }

  let consentRecord = await ConsentPreference.findOne({ consentToken: token });

  if (consentRecord) {
    consentRecord.cookies = cookies ?? consentRecord.cookies;
    consentRecord.marketingEmails = marketingEmails ?? consentRecord.marketingEmails;
    consentRecord.updateNotifications = updateNotifications ?? consentRecord.updateNotifications;
    consentRecord.personalizedRecommendations =
      personalizedRecommendations ?? consentRecord.personalizedRecommendations;
    if (userId) {
      consentRecord.userId = new mongoose.Types.ObjectId(userId);
    }
    await consentRecord.save();
  } else {
    consentRecord = new ConsentPreference({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      consentToken: token,
      cookies: cookies || false,
      marketingEmails: marketingEmails || false,
      updateNotifications: updateNotifications || false,
      personalizedRecommendations: personalizedRecommendations || false,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await consentRecord.save();
  }

  // If user is authenticated, sync their profile notification settings too
  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      user.notificationPreferences = {
        email: updateNotifications ?? user.notificationPreferences?.email ?? true,
        sms: user.notificationPreferences?.sms ?? false,
        whatsapp: user.notificationPreferences?.whatsapp ?? false,
        inApp: user.notificationPreferences?.inApp ?? true,
        push: user.notificationPreferences?.push ?? true,
        categories: {
          orderUpdates: user.notificationPreferences?.categories?.orderUpdates ?? true,
          promotions:
            marketingEmails ?? user.notificationPreferences?.categories?.promotions ?? true,
          security: user.notificationPreferences?.categories?.security ?? true,
          newsletter:
            marketingEmails ?? user.notificationPreferences?.categories?.newsletter ?? true,
          bookingUpdates: user.notificationPreferences?.categories?.bookingUpdates ?? true,
          rentalUpdates: user.notificationPreferences?.categories?.rentalUpdates ?? true,
        },
      };
      await user.save();
    }
  }

  res
    .status(200)
    .json(new ApiResponse(true, 'Visitor consent preferences updated successfully', consentRecord));
});

/**
 * Public endpoint to fetch active preferences by token
 */
export const getConsentPreference = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const consent = await ConsentPreference.findOne({ consentToken: token });
  if (!consent) {
    throw new ApiError(404, 'Consent record not found for this visitor token');
  }
  res.status(200).json(new ApiResponse(true, 'Consent preferences fetched', consent));
});

/**
 * Tracking Pixel for Email Opens (1x1 Transparent GIF)
 */
export const trackEmailOpen = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const log = await NotificationLog.findOne({ trackingToken: token });
    if (log && !log.openedAt) {
      log.openedAt = new Date();
      await log.save();

      // If associated with a campaign, update campaign analytics count
      if (log.campaignId) {
        await EmailCampaign.findByIdAndUpdate(log.campaignId, {
          $inc: { 'stats.openCount': 1 },
        });
      }
      logger.info(`Email open tracked for recipient ${log.recipientEmail} (Log ID: ${log.id})`);
    }
  } catch (err) {
    logger.error('Failed to log email open tracking pixel:', err);
  }

  // Always return the transparent 1x1 GIF regardless of database outcome
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': transparentGif.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(transparentGif);
});

/**
 * Click tracking redirect gateway
 */
export const trackEmailClick = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    return res.redirect(getFrontendUrl());
  }

  try {
    const log = await NotificationLog.findOne({ trackingToken: token });
    if (log) {
      log.clicks.push({
        url: targetUrl,
        clickedAt: new Date(),
      });
      await log.save();

      // Increment campaign click count if mapped
      if (log.campaignId) {
        await EmailCampaign.findByIdAndUpdate(log.campaignId, {
          $inc: { 'stats.clickCount': 1 },
        });
      }
      logger.info(`Email click tracked to ${targetUrl} for ${log.recipientEmail}`);
    }
  } catch (err) {
    logger.error('Failed to record click redirection tracking details:', err);
  }

  // Redirect visitors straight to their intended path (e.g. products, events, collection details)
  res.redirect(targetUrl);
});

/**
 * Public / Unsubscribe Endpoint
 */
export const unsubscribeRecipient = asyncHandler(async (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    throw new ApiError(400, 'Invalid request: Email parameter missing');
  }

  const lowercaseEmail = email.toLowerCase().trim();

  // 1. Update user settings if user exists
  await User.updateMany(
    { email: lowercaseEmail },
    {
      $set: {
        'notificationPreferences.categories.promotions': false,
        'notificationPreferences.categories.newsletter': false,
      },
    },
  );

  // 2. Update general visitor consent preferences
  await ConsentPreference.updateMany(
    { consentToken: lowercaseEmail },
    { $set: { marketingEmails: false } },
  );

  // also update by consentToken if there is a mapping
  await ConsentPreference.updateMany(
    { email: lowercaseEmail },
    { $set: { marketingEmails: false } },
  );

  // Redirect to a beautiful confirmation screen or send clean styled confirmation
  res.send(`
    <div style="background-color: #faf9f6; font-family: 'Playfair Display', serif; max-width: 500px; margin: 50px auto; padding: 40px; border: 1px solid #efeeeb; border-radius: 12px; text-align: center; color: #2d2b29; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
      <h2 style="color: #735c00; font-weight: 300; letter-spacing: 2px;">✦ Unsubscribed ✦</h2>
      <p style="font-family: sans-serif; font-size: 14px; color: #7f7663; line-height: 1.6; margin-top: 15px;">
        Your preference has been logged successfully. You have been removed from our marketing newsletter list and will no longer receive curations or offers from Siri Arts.
      </p>
      <div style="margin-top: 25px;">
        <a href="${getFrontendUrl()}" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 10px 25px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: sans-serif;">Return to Storefront</a>
      </div>
    </div>
  `);
});

/**
 * ADMIN: Create Custom Email Campaign
 */
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { title, subject, templateId, customHtml, targetAudience, scheduledAt } = req.body;

  const campaign = new EmailCampaign({
    title,
    subject,
    templateId: templateId ? new mongoose.Types.ObjectId(templateId) : undefined,
    customHtml,
    targetAudience: {
      role: targetAudience?.role || 'all',
      consentedOnly: targetAudience?.consentedOnly !== false, // default true
    },
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    status: scheduledAt ? 'scheduled' : 'draft',
  });

  await campaign.save();
  res.status(201).json(new ApiResponse(true, 'Campaign created successfully', campaign));
});

/**
 * ADMIN: Fetch All Campaigns
 */
export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const campaigns = await EmailCampaign.find()
    .populate('templateId')
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(new ApiResponse(true, 'Campaigns fetched', campaigns));
});

/**
 * ADMIN: Trigger Campaign Dispatch (instant)
 */
export const triggerCampaignSend = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await EmailCampaign.findById(id);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    throw new ApiError(400, 'Campaign is already sending or has been processed');
  }

  // Trigger dispatch in background asynchronously
  runCampaignDispatch(campaign.id).catch((err) => {
    logger.error(`Error dispatched in background for campaign ${campaign.id}:`, err);
  });

  res.status(200).json(new ApiResponse(true, 'Campaign dispatch initiated in background'));
});

/**
 * ADMIN: Fetch Email Templates
 */
export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = await EmailTemplate.find().sort({ name: 1 }).lean();
  res.status(200).json(new ApiResponse(true, 'Templates fetched', templates));
});

/**
 * ADMIN: Create Email Template
 */
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, subjectLine, htmlContent, designJson, type } = req.body;

  const template = new EmailTemplate({
    name,
    subjectLine,
    htmlContent,
    designJson,
    type,
  });

  await template.save();
  res.status(201).json(new ApiResponse(true, 'Template created successfully', template));
});

/**
 * ADMIN: Update Email Template
 */
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, subjectLine, htmlContent, designJson, type, isActive } = req.body;
  const template = await EmailTemplate.findById(req.params.id);

  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  if (name !== undefined) template.name = name;
  if (subjectLine !== undefined) template.subjectLine = subjectLine;
  if (htmlContent !== undefined) template.htmlContent = htmlContent;
  if (designJson !== undefined) template.designJson = designJson;
  if (type !== undefined) template.type = type;
  if (isActive !== undefined) template.isActive = isActive;

  await template.save();
  res.status(200).json(new ApiResponse(true, 'Template updated successfully', template));
});

/**
 * ADMIN: Aggregate Notification System Analytics Dashboard
 */
export const getNotificationAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const totalLogs = await NotificationLog.countDocuments();
  const openedLogs = await NotificationLog.countDocuments({
    openedAt: { $exists: true, $ne: null },
  });

  // Aggregate total link clicks
  const logsWithClicks = await NotificationLog.find({ 'clicks.0': { $exists: true } })
    .select('clicks')
    .lean();
  let totalClicks = 0;
  logsWithClicks.forEach((log) => {
    totalClicks += log.clicks.length;
  });

  const campaignsCount = await EmailCampaign.countDocuments();
  const activeTemplatesCount = await EmailTemplate.countDocuments({ isActive: true });
  const totalConsentsCount = await ConsentPreference.countDocuments();
  const directSubscribersCount = await ConsentPreference.countDocuments({ marketingEmails: true });

  // Get status breakdown of delivery logs
  const statusBreakdown = await NotificationLog.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Daily log trends for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyDispatches = await NotificationLog.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        opened: { $sum: { $cond: [{ $ifNull: ['$openedAt', false] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Analytics report compiled successfully', {
      overview: {
        totalDispatched: totalLogs,
        totalOpened: openedLogs,
        totalClicks,
        openRate: totalLogs > 0 ? ((openedLogs / totalLogs) * 100).toFixed(2) + '%' : '0%',
        campaignsCount,
        activeTemplates: activeTemplatesCount,
        visitorConsentProfiles: totalConsentsCount,
        newsletterSubscribers: directSubscribersCount,
      },
      statusBreakdown,
      dailyTrends: dailyDispatches,
    }),
  );
});
