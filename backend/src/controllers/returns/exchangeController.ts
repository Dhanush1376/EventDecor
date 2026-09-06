import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { ExchangeService } from '../../services/returns/ExchangeService';
import ExchangeRequest from '../../models/ExchangeRequest';
import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';

/**
 * @desc    Create exchange request
 * @route   POST /api/v1/exchanges
 * @access  Private
 */
export const createExchange = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const {
    orderId,
    originalProductId,
    replacementProductId,
    exchangeType,
    quantity,
    reason,
    pickupAddress,
    idempotencyKey,
    refundMethod,
    upiId,
  } = req.body;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const { returnRequest, exchangeRequest, razorpayOrderId, amountToPay } =
    await ExchangeService.createExchangeRequest(
      userId,
      orderId,
      originalProductId,
      replacementProductId,
      exchangeType,
      quantity,
      reason,
      pickupAddress,
      idempotencyKey,
      refundMethod,
      upiId,
    );

  if (amountToPay === 0) {
    await Order.findByIdAndUpdate(orderId, { hasActiveExchange: true });
  }

  res.status(201).json({
    success: true,
    data: {
      exchangeRequest,
      returnRequest,
      razorpayOrderId,
      amountToPay,
    },
  });
});

/**
 * @desc    Get my exchanges
 * @route   GET /api/v1/exchanges/my-exchanges
 * @access  Private
 */
export const getMyExchanges = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  // Find exchanges where the related return request belongs to this user
  const exchanges = await ExchangeRequest.aggregate([
    {
      $lookup: {
        from: 'returnrequests',
        localField: 'returnRequestId',
        foreignField: '_id',
        as: 'returnRequest',
      },
    },
    { $unwind: '$returnRequest' },
    {
      $match: {
        'returnRequest.userId': new (require('mongoose').Types.ObjectId)(userId),
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: exchanges,
    count: exchanges.length,
  });
});

/**
 * @desc    Get all exchange requests (admin)
 * @route   GET /api/v1/exchanges/admin/all
 * @access  Admin
 */
export const getAllExchanges = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const exchanges = await ExchangeRequest.find()
    .populate({
      path: 'returnRequestId',
      select: 'status returnId orderId userId items upiId refundMethod',
      populate: { path: 'userId', select: 'name email phone' },
    })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ExchangeRequest.countDocuments();

  res.status(200).json({
    success: true,
    data: exchanges,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Verify Razorpay payment for exchange
 * @route   POST /api/v1/exchanges/verify-payment
 * @access  Private
 */
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, 'Missing payment details');
  }

  const { RazorpayGateway } = require('../../utils/payment/RazorpayGateway');
  const isValid = RazorpayGateway.getInstance().verifySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  );

  if (!isValid) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const exchangeRequest = await ExchangeRequest.findOne({
    additionalPaymentId: razorpayOrderId,
  }).populate('returnRequestId');

  if (!exchangeRequest) {
    throw new ApiError(404, 'Exchange request not found for this payment');
  }

  // Authorization check
  const returnReqDoc = exchangeRequest.returnRequestId as any;
  if (!returnReqDoc || returnReqDoc.userId.toString() !== (req.user as any)?._id?.toString()) {
    throw new ApiError(403, 'Not authorized to verify payment for this exchange');
  }

  if (exchangeRequest.paymentStatus === 'payment_paid') {
    return res.status(200).json({ success: true, message: 'Payment already verified' });
  }

  exchangeRequest.paymentStatus = 'payment_paid';
  // inspectionStatus remains 'pending' - admin must explicitly approve

  exchangeRequest.timeline.push({
    action: 'Payment Verified',
    timestamp: new Date(),
  });

  await exchangeRequest.save();

  // Lock the order now that payment is verified
  const returnReq = await require('../../models/ReturnRequest')
    .default.findById(exchangeRequest.returnRequestId)
    .lean();
  if (returnReq) {
    await Order.findByIdAndUpdate(returnReq.orderId, { hasActiveExchange: true });
  }

  // Trigger side effects: Send Payment Verified Email
  const { ReturnNotificationService } = require('../../services/returns/ReturnNotificationService');
  await ReturnNotificationService.notifyCustomerExchangeVerified(exchangeRequest.returnRequestId);

  res.status(200).json({ success: true, message: 'Payment verified successfully' });
});
