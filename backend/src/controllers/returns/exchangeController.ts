import { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../../utils/asyncHandler';
import ExchangeRequest from '../../models/ExchangeRequest';
import ReturnRequest from '../../models/ReturnRequest';
import ApiError from '../../utils/ApiError';

/**
 * @desc    Exchanges created by the previous automated flow (read-only history).
 *          New exchange requests are made over WhatsApp (see returnController).
 * @route   GET /api/v1/exchanges/my-exchanges
 * @access  Private
 */
export const getMyExchanges = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  // Index-backed two-step lookup: the customer's return requests (userId index), then the
  // exchanges for those (returnRequestId). The previous $lookup started from every exchange in
  // the collection, so its cost grew with all customers' data rather than this customer's.
  const returns = await ReturnRequest.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  const returnsById = new Map(returns.map((r: any) => [String(r._id), r]));
  const exchanges = returns.length
    ? (
        await ExchangeRequest.find({ returnRequestId: { $in: returns.map((r: any) => r._id) } })
          .sort({ createdAt: -1 })
          .lean()
      ).map((e: any) => ({ ...e, returnRequest: returnsById.get(String(e.returnRequestId)) }))
    : [];

  res.status(200).json({ success: true, data: exchanges, count: exchanges.length });
});
