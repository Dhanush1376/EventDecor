import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ReturnRequest from '../../models/ReturnRequest';
import Order from '../../models/Order';
import ExchangeRequest from '../../models/ExchangeRequest';
import RefundRecord from '../../models/RefundRecord';
import { ReturnService } from '../../services/returns/ReturnService';
import { ReturnAnalyticsService } from '../../services/returns/ReturnAnalyticsService';
import { FraudDetectionService } from '../../services/returns/FraudDetectionService';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import mongoose from 'mongoose';
import ReturnPolicy from '../../models/ReturnPolicy';
import { ReturnStateMachine } from '../../services/returns/ReturnStateMachine';
import { ExchangeStateMachine } from '../../services/returns/ExchangeStateMachine';

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
  if (req.query.type) query.returnType = req.query.type;

  // Advanced search handling
  if (req.query.search) {
    const search = String(req.query.search);
    query.$or = [
      { returnId: { $regex: search, $options: 'i' } },
      { 'items.title': { $regex: search, $options: 'i' } },
      { 'pickup.trackingId': { $regex: search, $options: 'i' } },
      { upiId: { $regex: search, $options: 'i' } },
    ];
  }

  const returns = await ReturnRequest.find(query)
    .populate('userId', 'name email phone')
    .populate('orderId', 'orderStatus paymentStatus shippingAddress paymentMethod')
    .populate('items.productId', 'title imageSrc')
    .sort({ createdAt: -1, _id: -1 })
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
  const paramId = req.params.id;
  const isObjectId = mongoose.isValidObjectId(paramId);

  let returnRequest = await ReturnRequest.findOne(
    isObjectId ? { _id: paramId } : { returnId: paramId },
  )
    .populate('userId', 'name email phone avatar')
    .populate('orderId', 'paymentStatus orderStatus total items shippingAddress paymentMethod')
    .populate('items.productId', 'title imageSrc')
    .populate('assignedStaff', 'name email')
    .populate('refundRecordId');

  if (!returnRequest && !isObjectId) {
    const ExchangeRequest = require('../../models/ExchangeRequest').default;
    const linkedExchange = await ExchangeRequest.findOne({ exchangeId: paramId });
    if (linkedExchange) {
      returnRequest = await ReturnRequest.findById(linkedExchange.returnRequestId)
        .populate('userId', 'name email phone avatar')
        .populate('orderId', 'paymentStatus orderStatus total items shippingAddress paymentMethod')
        .populate('items.productId', 'title imageSrc')
        .populate('assignedStaff', 'name email')
        .populate('refundRecordId');
    }
  }

  if (!returnRequest) {
    throw new ApiError(404, 'Return request not found');
  }

  // Fetch exchange details if applicable
  let exchangeDetails = null;
  if (returnRequest.returnType === 'exchange') {
    const ExchangeRequest = require('../../models/ExchangeRequest').default;
    exchangeDetails = await ExchangeRequest.findOne({
      returnRequestId: returnRequest._id,
    }).populate('additionalRefundId');
  }

  // Add user profile stats (fraud score, total orders, etc)
  const userIdStr = returnRequest.userId?._id
    ? returnRequest.userId._id.toString()
    : returnRequest.userId?.toString();
  const userStats = userIdStr ? await FraudDetectionService.getUserReturnProfile(userIdStr) : null;

  res.status(200).json({
    success: true,
    data: {
      request: returnRequest,
      exchangeDetails,
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
  const nextStatus = req.body.nextStatus || req.body.status;
  if (!adminId) throw new ApiError(401, 'Unauthorized');
  if (!nextStatus) throw new ApiError(400, 'Next status is required');

  const metadata = req.body.reason
    ? { reason: req.body.reason, ...req.body.metadata }
    : req.body.metadata;

  const returnRequest = await ReturnStateMachine.transition(
    req.params.id as string,
    nextStatus,
    adminId,
    metadata,
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

  const method = req.body.method;
  if (!['wallet', 'original'].includes(method)) {
    throw new ApiError(400, 'Invalid refund method specified');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const returnReq = await ReturnRequest.findById(req.params.id).session(session);
    if (!returnReq) throw new ApiError(404, 'Return request not found');

    if (returnReq.status !== 'inspection_completed') {
      throw new ApiError(
        400,
        `Cannot process refund in ${returnReq.status} state. Expected inspection_completed.`,
      );
    }

    const order = await Order.findById(returnReq.orderId).session(session);
    if (!order) throw new ApiError(404, 'Order not found');

    if (method === 'original' && order.paymentMethod === 'cod') {
      throw new ApiError(
        400,
        'Cannot refund to original payment method for COD orders. Please select wallet.',
      );
    }

    let refundAmount = 0;
    if (returnReq.returnType === 'exchange') {
      const exchange = await ExchangeRequest.findOne({ returnRequestId: returnReq._id }).session(
        session,
      );
      if (exchange && exchange.differenceAction === 'refund_difference') {
        refundAmount = exchange.priceDifference;
      }
    } else {
      const { ReturnService } = require('../../services/returns/ReturnService');
      ReturnService.calculateRefund(returnReq, order);
      refundAmount = returnReq.refundBreakdown?.grandTotal || 0;
    }

    if (refundAmount <= 0) {
      throw new ApiError(400, 'Refund amount must be greater than 0');
    }

    const existingRefund = await RefundRecord.findOne({
      returnRequestId: returnReq._id,
      status: { $in: ['pending', 'processing', 'completed'] },
    }).session(session);
    if (existingRefund) {
      throw new ApiError(400, 'Refund has already been initiated or completed for this return.');
    }

    returnReq.executedRefundMethod = method as any;
    await returnReq.save({ session });

    let returnRequest = await ReturnStateMachine.transition(
      req.params.id as string,
      'refund_initiated',
      adminId,
      undefined,
      session,
    );

    if (method === 'wallet') {
      returnRequest = await ReturnStateMachine.transition(
        req.params.id as string,
        'refund_completed',
        adminId,
        undefined,
        session,
      );
      returnRequest = await ReturnStateMachine.transition(
        req.params.id as string,
        'completed',
        adminId,
        undefined,
        session,
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * @desc    Record manual/direct refund settlement (e.g. UPI payout for exchange difference or COD return)
 * @route   POST /api/v1/returns/admin/:id/settle-refund
 * @access  Admin
 */
export const recordRefundSettlement = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const { amount, transactionId, paymentMethod = 'upi', upiId, notes } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const paramId = req.params.id;
    const isObjectId = mongoose.isValidObjectId(paramId);

    let returnReq = await ReturnRequest.findOne(
      isObjectId ? { _id: paramId } : { returnId: paramId },
    ).session(session);

    if (!returnReq && !isObjectId) {
      const ExchangeRequest = require('../../models/ExchangeRequest').default;
      const linkedExchange = await ExchangeRequest.findOne({ exchangeId: paramId }).session(
        session,
      );
      if (linkedExchange) {
        returnReq = await ReturnRequest.findById(linkedExchange.returnRequestId).session(session);
      }
    }

    if (!returnReq) throw new ApiError(404, 'Return request not found');

    const order = await Order.findById(returnReq.orderId).session(session);
    if (!order) throw new ApiError(404, 'Order not found');

    const ExchangeRequest = require('../../models/ExchangeRequest').default;
    const exchange = await ExchangeRequest.findOne({ returnRequestId: returnReq._id }).session(
      session,
    );

    const payoutAmount =
      Number(amount) ||
      (exchange?.priceDifference
        ? exchange.priceDifference
        : returnReq.refundBreakdown?.grandTotal || 0);

    if (payoutAmount <= 0) {
      throw new ApiError(400, 'Settlement amount must be greater than 0');
    }

    const effectiveUpi = upiId || exchange?.upiId || returnReq.upiId || 'N/A';
    const effectiveTxId = transactionId?.trim() || `UPI-MANUAL-${Date.now()}`;

    // 1. Create or update RefundRecord
    let refundRecord = await RefundRecord.findOne({
      returnRequestId: returnReq._id,
      status: { $in: ['completed', 'processing', 'pending'] },
    }).session(session);

    if (!refundRecord) {
      const created = await RefundRecord.create(
        [
          {
            amount: payoutAmount,
            currency: 'INR',
            originalTransactionId: effectiveTxId,
            entityType: 'Order',
            entityId: order._id,
            status: 'completed',
            returnRequestId: returnReq._id,
            refundMethod: paymentMethod === 'wallet' ? 'wallet' : 'gateway',
            bankReference: effectiveTxId,
            reason: notes || `Exchange refund difference paid to customer (${effectiveUpi})`,
            completedAt: new Date(),
            refundBreakdown: {
              productTotal: payoutAmount,
              taxRefund: 0,
              shippingRefund: 0,
              couponDeduction: 0,
              walletDeduction: 0,
            },
          },
        ],
        { session },
      );
      refundRecord = created[0];
    } else {
      refundRecord.status = 'completed';
      refundRecord.amount = payoutAmount;
      refundRecord.bankReference = effectiveTxId;
      refundRecord.completedAt = new Date();
      if (notes) refundRecord.reason = notes;
      await refundRecord.save({ session });
    }

    // 2. Update ExchangeRequest if linked
    if (exchange) {
      exchange.additionalRefundId = refundRecord._id;
      if (exchange.differenceAction === 'refund_difference') {
        exchange.paymentStatus = 'payment_paid';
      }
      if (effectiveUpi && !exchange.upiId) {
        exchange.upiId = effectiveUpi;
      }
      exchange.timeline.push({
        action: `Refund difference of ₹${payoutAmount} paid to customer (${effectiveUpi}). UTR/Ref: ${effectiveTxId}`,
        timestamp: new Date(),
        performedBy: new mongoose.Types.ObjectId(adminId),
      });
      await exchange.save({ session });
    }

    // 3. Update ReturnRequest
    returnReq.refundRecordId = refundRecord._id;
    returnReq.executedRefundMethod = paymentMethod === 'wallet' ? 'wallet' : 'original';
    if (effectiveUpi && !returnReq.upiId) {
      returnReq.upiId = effectiveUpi;
    }

    const eventDesc = `Refund payout of ₹${payoutAmount} marked as PAID to customer (${effectiveUpi}) via ${paymentMethod.toUpperCase()}. Reference / UTR: ${effectiveTxId}.${notes ? ` Note: ${notes}` : ''}`;

    returnReq.timeline.push({
      action: 'refund_settled',
      description: eventDesc,
      performedBy: new mongoose.Types.ObjectId(adminId),
      performedByName: (req.user as any)?.name || 'Admin',
      performedByRole: (req.user as any)?.role || 'admin',
      metadata: {
        amount: payoutAmount,
        paymentMethod,
        upiId: effectiveUpi,
        transactionId: effectiveTxId,
        notes,
        refundRecordId: refundRecord._id,
        settledAt: new Date(),
      },
      timestamp: new Date(),
    });

    returnReq.auditLog.push({
      timestamp: new Date(),
      user: new mongoose.Types.ObjectId(adminId),
      userType: 'admin',
      action: 'REFUND_SETTLED_MANUALLY',
      reason: notes || `Admin confirmed payment of ₹${payoutAmount} to ${effectiveUpi}`,
      oldValue: { refundStatus: 'pending' },
      newValue: {
        refundStatus: 'completed',
        amount: payoutAmount,
        transactionId: effectiveTxId,
        upiId: effectiveUpi,
      },
    });

    if (returnReq.status === 'inspection_completed') {
      returnReq.status = 'refund_completed';
    }

    await returnReq.save({ session });
    await session.commitTransaction();

    const updatedReturn = await ReturnRequest.findById(returnReq._id)
      .populate('userId', 'name email phone avatar')
      .populate('orderId', 'paymentStatus orderStatus total items shippingAddress paymentMethod')
      .populate('items.productId', 'title imageSrc')
      .populate('assignedStaff', 'name email')
      .populate('refundRecordId');

    const updatedExchange = exchange
      ? await ExchangeRequest.findById(exchange._id).populate('additionalRefundId')
      : null;

    res.status(200).json({
      success: true,
      message: `Refund of ₹${payoutAmount} registered as paid successfully.`,
      data: {
        request: updatedReturn,
        exchangeDetails: updatedExchange,
        refundRecord,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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
      await ReturnStateMachine.transition(
        req.params.id as string,
        'return_courier_assigned',
        adminId,
        {
          reason: 'Pickup scheduled',
        },
      );
    } else if (req.body.status === 'picked_up' && returnRequest.status !== 'return_picked_up') {
      await ReturnStateMachine.transition(req.params.id as string, 'return_picked_up', adminId, {
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

/**
 * @desc    Transition exchange replacement status
 * @route   PATCH /api/v1/returns/admin/exchanges/:id/transition
 * @access  Admin
 */
export const transitionExchangeReplacement = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const { status, metadata } = req.body;

  if (!adminId) throw new ApiError(401, 'Unauthorized');
  if (!status) throw new ApiError(400, 'Next status is required');

  const exchange = await ExchangeStateMachine.transitionReplacement(
    req.params.id as string,
    status,
    adminId,
    metadata,
  );

  res.status(200).json({
    success: true,
    data: exchange,
  });
});

/**
 * @desc    Create replacement order for exchange
 * @route   POST /api/v1/returns/admin/exchanges/:id/replacement-order
 * @access  Admin
 */
export const createReplacementOrder = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;

  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const order = await ExchangeStateMachine.createReplacementOrder(req.params.id as string, adminId);

  res.status(201).json({
    success: true,
    data: order,
  });
});
