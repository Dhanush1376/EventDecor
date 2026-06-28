import mongoose from 'mongoose';
import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { ReturnService } from '../../services/returns/ReturnService';
import ReturnRequest from '../../models/ReturnRequest';
import '../../models/Order';
import '../../models/Product';
import ApiError from '../../utils/ApiError';

/**
 * @desc    Create a return request (multi-item)
 * @route   POST /api/v1/returns
 * @access  Private
 */
export const createReturn = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, items, refundMethod, upiId, pickupAddress, idempotencyKey } = req.body;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  // Call service to validate and create return
  const returnRequest = await ReturnService.createReturnRequest(
    userId,
    orderId,
    items,
    refundMethod || 'original',
    pickupAddress,
    upiId,
    idempotencyKey,
  );

  res.status(201).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Get current user's returns with stats
 * @route   GET /api/v1/returns/my-returns
 * @access  Private
 */
export const getMyReturns = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const returns = await ReturnRequest.find({ userId })
    .sort({ createdAt: -1 })
    .populate('orderId', 'orderStatus paymentStatus total trackingNumber')
    .populate('items.productId', 'title imageSrc')
    .lean();

  res.status(200).json({
    success: true,
    data: {
      returns,
    },
  });
});

/**
 * @desc    Get single return by ID (for customer)
 * @route   GET /api/v1/returns/:id
 * @access  Private
 */
export const getReturnById = asyncHandler(async (req: Request, res: Response) => {
  const returnRequest = await ReturnRequest.findOne({
    _id: req.params.id,
    userId: req.user?.id,
  })
    .populate('orderId')
    .populate('items.productId', 'title imageSrc');

  if (!returnRequest) {
    throw new ApiError(404, 'Return request not found');
  }

  // Filter out internal notes in conversation
  const safeData = returnRequest.toObject();
  safeData.conversation = safeData.conversation.filter((msg) => !msg.isInternal);

  res.status(200).json({
    success: true,
    data: safeData,
  });
});

/**
 * @desc    Check return eligibility for an order
 * @route   GET /api/v1/returns/eligibility/:orderId
 * @access  Private
 */
export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const orderId = req.params.orderId as string;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const eligibility = await ReturnService.getReturnEligibility(orderId, userId);

  res.status(200).json({
    success: true,
    data: eligibility,
  });
});

/**
 * @desc    Add a message to the return conversation thread
 * @route   POST /api/v1/returns/:id/message
 * @access  Private
 */
export const addConversationMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message, attachments } = req.body;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnRequest.findOne({
    _id: req.params.id,
    userId,
  });

  if (!returnRequest) {
    throw new ApiError(404, 'Return request not found');
  }

  returnRequest.conversation.push({
    sender: 'customer',
    senderId: new (mongoose as any).Types.ObjectId(userId),
    senderName: req.user?.name,
    message,
    attachments: attachments || [],
    isInternal: false,
    createdAt: new Date(),
  });

  await returnRequest.save();

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Cancel a return request (if still pending)
 * @route   POST /api/v1/returns/:id/cancel
 * @access  Private
 */
export const cancelReturn = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await ReturnRequest.findOne({
    _id: req.params.id,
    userId,
  });

  if (!returnRequest) {
    throw new ApiError(404, 'Return request not found');
  }

  if (!['submitted', 'approved'].includes(returnRequest.status)) {
    throw new ApiError(400, `Cannot cancel a return that is in ${returnRequest.status} stage`);
  }

  // Use ReturnStateMachine to transition so side effects (like unlocking items) run
  const { ReturnStateMachine } = require('../../services/returns/ReturnStateMachine');
  const updatedRequest = await ReturnStateMachine.transition(
    returnRequest._id.toString(),
    'cancelled',
    userId,
    { reason: 'Customer cancelled the return request' },
  );

  res.status(200).json({
    success: true,
    data: updatedRequest,
  });
});

/**
 * @desc    Get order return summary
 * @route   GET /api/v1/returns/order/:orderId/summary
 * @access  Private/Admin
 */
export const getReturnForOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  // Check if admin or owner
  const isAdmin =
    req.user?.role &&
    ['super_admin', 'main_admin', 'admin', 'editor', 'analyst'].includes(req.user.role);

  const query: any = { orderId };
  if (!isAdmin) {
    query.userId = userId;
  }

  const returns = await ReturnRequest.find(query)
    .populate('items.productId', 'title imageSrc')
    .lean();

  const ExchangeRequest = require('../../models/ExchangeRequest').default;
  const returnIds = returns.map((r) => r._id);
  const exchanges = await ExchangeRequest.find({ returnRequestId: { $in: returnIds } }).lean();

  res.status(200).json({
    success: true,
    data: { returns, exchanges },
  });
});
