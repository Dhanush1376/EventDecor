import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { ExchangeService } from '../../services/returns/ExchangeService';
import ExchangeRequest from '../../models/ExchangeRequest';
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
    pickupAddress,
  } = req.body;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const { returnRequest, exchangeRequest } = await ExchangeService.createExchangeRequest(
    userId,
    orderId,
    originalProductId,
    replacementProductId,
    exchangeType,
    quantity,
    pickupAddress,
  );

  res.status(201).json({
    success: true,
    data: {
      exchangeRequest,
      returnRequest,
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
    { $match: { 'returnRequest.userId': userId } },
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
      select: 'status returnId orderId userId',
      populate: { path: 'userId', select: 'name email phone' },
    })
    .sort({ createdAt: -1 })
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
