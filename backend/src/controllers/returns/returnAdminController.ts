import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ReturnRequest from '../../models/ReturnRequest';
import { ReturnService } from '../../services/returns/ReturnService';
import { ReturnAnalyticsService } from '../../services/returns/ReturnAnalyticsService';
import { FraudDetectionService } from '../../services/returns/FraudDetectionService';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import mongoose from 'mongoose';
import ReturnPolicy from '../../models/ReturnPolicy';
import { ReturnStateMachine } from '../../services/returns/ReturnStateMachine';

/**
 * @desc    Get all returns with advanced search & pagination
 * @route   GET /api/v1/returns/admin/all
 * @access  Admin
 */
export const getAllReturns = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Build query from filters (Req #11 - Advanced Search)
  const query: any = {};

  if (req.query.status) query.status = req.query.status;
  if (req.query.priority) query.priority = req.query.priority;
  if (req.query.fraudScore) query.fraudScore = { $gte: Number(req.query.fraudScore) };

  // Advanced search handling
  if (req.query.search) {
    const search = String(req.query.search);
    query.$or = [
      { returnId: { $regex: search, $options: 'i' } },
      { 'items.title': { $regex: search, $options: 'i' } },
      { 'pickup.trackingId': { $regex: search, $options: 'i' } },
    ];
  }

  const returns = await ReturnRequest.find(query)
    .populate('userId', 'name email phone')
    .populate('orderId', 'orderStatus paymentStatus')
    .populate('items.productId', 'title imageSrc')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ReturnRequest.countDocuments(query);

  res.status(200).json({
    success: true,
    data: returns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get detailed return request by ID
 * @route   GET /api/v1/returns/admin/:id
 * @access  Admin
 */
export const getReturnDetails = asyncHandler(async (req: Request, res: Response) => {
  const returnRequest = await ReturnRequest.findById(req.params.id)
    .populate('userId', 'name email phone avatar')
    .populate('orderId', 'paymentStatus orderStatus total items')
    .populate('items.productId', 'title imageSrc')
    .populate('assignedStaff', 'name email');

  if (!returnRequest) {
    throw new ApiError(404, 'Return request not found');
  }

  // Add user profile stats (fraud score, total orders, etc)
  const userStats = await FraudDetectionService.getUserReturnProfile(
    returnRequest.userId.toString(),
  );

  res.status(200).json({
    success: true,
    data: {
      request: returnRequest,
      userStats,
    },
  });
});

/**
 * @desc    Approve a return request
 * @route   PATCH /api/v1/returns/admin/:id/approve
 * @access  Admin
 */
export const approveReturn = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnService.approveReturn(req.params.id as string, adminId);

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Get dashboard analytics & SLA stats
 * @route   GET /api/v1/returns/admin/dashboard
 * @access  Admin
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await ReturnAnalyticsService.getReturnDashboardStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Add an internal note (admin only)
 * @route   POST /api/v1/returns/admin/:id/notes
 * @access  Admin
 */
export const addInternalNote = asyncHandler(async (req: Request, res: Response) => {
  const { note, attachments } = req.body;
  const adminId = req.user?.id;

  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnRequest.findById(req.params.id);
  if (!returnRequest) throw new ApiError(404, 'Return request not found');

  returnRequest.conversation.push({
    sender: 'admin',
    senderId: new (mongoose as any).Types.ObjectId(adminId),
    senderName: req.user?.name || 'Admin',
    message: note,
    attachments: attachments || [],
    isInternal: true, // Req #19 - hidden from customer
    createdAt: new Date(),
  });

  await returnRequest.save();

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Bulk operations (approve, assign, etc)
 * @route   POST /api/v1/returns/admin/bulk
 * @access  Admin
 */
export const bulkAction = asyncHandler(async (req: Request, res: Response) => {
  const { action, ids, data } = req.body;
  const adminId = req.user?.id;

  if (!adminId) throw new ApiError(401, 'Unauthorized');
  if (!ids || !ids.length) throw new ApiError(400, 'No IDs provided');

  let successCount = 0;

  // A simplified loop. In production this should be a transaction.
  for (const id of ids) {
    try {
      if (action === 'approve') {
        await ReturnService.approveReturn(id, adminId);
      } else if (action === 'assign') {
        await ReturnRequest.findByIdAndUpdate(id, { assignedStaff: data.staffId });
      }
      successCount++;
    } catch (err) {
      logger.error(`Bulk action ${action} failed for ${id}:`, err);
    }
  }

  res.status(200).json({
    success: true,
    message: `Successfully performed ${action} on ${successCount}/${ids.length} items.`,
  });
});

/**
 * @desc    Get refund dashboard stats
 * @route   GET /api/v1/returns/admin/refunds/stats
 * @access  Admin
 */
export const getRefundStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await ReturnAnalyticsService.getRefundDashboardStats();
  res.status(200).json({ success: true, data: stats });
});

/**
 * @desc    Get today's pickups list
 * @route   GET /api/v1/returns/admin/pickups
 * @access  Admin
 */
export const getPickupList = asyncHandler(async (req: Request, res: Response) => {
  const data = await ReturnAnalyticsService.getPickupList();
  res.status(200).json({ success: true, data });
});

/**
 * @desc    Get analytics by dimension
 * @route   GET /api/v1/returns/admin/analytics
 * @access  Admin
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const dimension = (req.query.dimension as string) || 'category';
  const data = await ReturnAnalyticsService.getAnalyticsByDimension(dimension);
  res.status(200).json({ success: true, data });
});

/**
 * @desc    Get fraud alerts
 * @route   GET /api/v1/returns/admin/fraud/alerts
 * @access  Admin
 */
export const getFraudAlerts = asyncHandler(async (req: Request, res: Response) => {
  const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 60;
  const data = await FraudDetectionService.getFraudAlerts(threshold);
  res.status(200).json({ success: true, data });
});

/**
 * @desc    Get high risk customers
 * @route   GET /api/v1/returns/admin/fraud/customers
 * @access  Admin
 */
export const getHighRiskCustomers = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const data = await FraudDetectionService.getHighRiskCustomers(limit);
  res.status(200).json({ success: true, data });
});

/**
 * @desc    Get global return settings
 * @route   GET /api/v1/returns/admin/settings
 * @access  Admin
 */
export const getReturnSettings = asyncHandler(async (req: Request, res: Response) => {
  let settings = await ReturnPolicy.findOne();
  if (!settings) {
    settings = await ReturnPolicy.create({}); // Create default if missing
  }
  res.status(200).json({ success: true, data: settings });
});

/**
 * @desc    Update global return settings
 * @route   PUT /api/v1/returns/admin/settings
 * @access  Admin
 */
export const updateReturnSettings = asyncHandler(async (req: Request, res: Response) => {
  let settings = await ReturnPolicy.findOne();
  if (!settings) {
    settings = new ReturnPolicy(req.body);
    await settings.save();
  } else {
    // Only update fields provided in the body
    const updateData = req.body;
    Object.keys(updateData).forEach((key) => {
      (settings as any)[key] = updateData[key];
    });
    await settings.save();
  }
  res.status(200).json({ success: true, data: settings });
});

/**
 * @desc    Reject a return request
 * @route   PATCH /api/v1/returns/admin/:id/reject
 * @access  Admin
 */
export const rejectReturn = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const { reason } = req.body;
  if (!adminId) throw new ApiError(401, 'Unauthorized');
  if (!reason) throw new ApiError(400, 'Rejection reason is required');

  const returnRequest = await ReturnStateMachine.transition(
    req.params.id as string,
    'rejected',
    adminId,
    { reason },
  );

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Transition status for a return request
 * @route   PATCH /api/v1/returns/admin/:id/transition
 * @access  Admin
 */
export const transitionStatus = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const { nextStatus } = req.body;
  if (!adminId) throw new ApiError(401, 'Unauthorized');
  if (!nextStatus) throw new ApiError(400, 'Next status is required');

  const returnRequest = await ReturnStateMachine.transition(
    req.params.id as string,
    nextStatus,
    adminId,
  );

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Trigger refund for a return request
 * @route   POST /api/v1/returns/admin/:id/refund
 * @access  Admin
 */
export const triggerRefund = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnStateMachine.transition(
    req.params.id as string,
    'refund_triggered',
    adminId,
  );

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Update pickup details
 * @route   PATCH /api/v1/returns/admin/:id/pickup
 * @access  Admin
 */
export const updatePickupDetails = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnRequest.findById(req.params.id);
  if (!returnRequest) throw new ApiError(404, 'Return request not found');

  returnRequest.pickup = {
    ...returnRequest.pickup,
    ...req.body,
  };

  if (req.body.status && returnRequest.pickup && req.body.status !== returnRequest.pickup.status) {
    if (req.body.status === 'assigned' && returnRequest.status === 'approved') {
      await ReturnStateMachine.transition(req.params.id as string, 'pickup_assigned', adminId, {
        reason: 'Pickup scheduled',
      });
    } else if (req.body.status === 'picked_up' && returnRequest.status !== 'picked_up') {
      await ReturnStateMachine.transition(req.params.id as string, 'picked_up', adminId, {
        reason: 'Item picked up by courier',
      });
    }
  } else {
    await returnRequest.save();
  }

  const updated = await ReturnRequest.findById(req.params.id);
  res.status(200).json({ success: true, data: updated });
});

/**
 * @desc    Complete a return request
 * @route   POST /api/v1/returns/admin/:id/complete
 * @access  Admin
 */
export const completeReturn = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnStateMachine.transition(
    req.params.id as string,
    'completed',
    adminId,
  );

  res.status(200).json({ success: true, data: returnRequest });
});

/**
 * @desc    Get enterprise analytics for Returns & Exchanges
 * @route   GET /api/v1/returns/admin/enterprise-analytics
 * @access  Admin
 */
export const getEnterpriseAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const ReturnAnalyticsService =
    require('../../services/returns/ReturnAnalyticsService').ReturnAnalyticsService;

  const [enterprise, financial, monthly] = await Promise.all([
    ReturnAnalyticsService.getEnterpriseAnalytics(),
    ReturnAnalyticsService.getFinancialImpact(),
    ReturnAnalyticsService.getMonthlyTrends(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      enterprise,
      financial,
      monthly,
    },
  });
});

/**
 * @desc    Get fraud metrics
 * @route   GET /api/v1/returns/admin/fraud/metrics
 * @access  Admin
 */
export const getFraudMetrics = asyncHandler(async (req: Request, res: Response) => {
  const data = await FraudDetectionService.getFraudMetrics();
  res.status(200).json({ success: true, data });
});

/**
 * @desc    Get exchange stats
 * @route   GET /api/v1/returns/admin/exchange-stats
 * @access  Admin
 */
export const getExchangeStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await ReturnAnalyticsService.getExchangeStats();
  res.status(200).json({ success: true, data });
});

/**
 * @desc    Get pickup stats
 * @route   GET /api/v1/returns/admin/pickup-stats
 * @access  Admin
 */
export const getPickupStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await ReturnAnalyticsService.getPickupStats();
  res.status(200).json({ success: true, data });
});
