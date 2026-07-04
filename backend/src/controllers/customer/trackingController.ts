import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import Fulfilment from '../../models/Fulfilment';
import { Transaction } from '../../models/Transaction';

export const getMyTrackingTimeline = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { transactionId } = req.query;

  const query: any = { customer: customerId };
  if (transactionId) {
    query.transactionId = transactionId;
  }

  // Fetch fulfilment tracking records, sorted by most recently updated
  const fulfillments = await Fulfilment.find(query)
    .populate(
      'transactionId',
      'transactionId domain referenceId canonicalStatus totalAmount paymentStatus',
    )
    .sort({ updatedAt: -1 })
    .lean();

  if (!fulfillments || fulfillments.length === 0) {
    return res.status(200).json(new ApiResponse(true, 'No active tracking timelines found', []));
  }

  res
    .status(200)
    .json(new ApiResponse(true, 'Unified tracking timelines fetched successfully', fulfillments));
});

export const getCustomer360Profile = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user!.id;

  // Aggregate customer value and history
  const [transactions, fulfilments] = await Promise.all([
    Transaction.find({ customer: customerId }).sort({ createdAt: -1 }).lean(),
    Fulfilment.find({ customer: customerId }).sort({ createdAt: -1 }).lean(),
  ]);

  const totalSpent = transactions.reduce(
    (acc: number, curr: any) => acc + (curr.totalAmount || 0),
    0,
  );
  const totalTransactions = transactions.length;

  res.status(200).json(
    new ApiResponse(true, 'Customer 360 profile fetched successfully', {
      totalSpent,
      totalTransactions,
      transactions,
      activeFulfilments: fulfilments.filter(
        (f: any) => !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(f.status),
      ),
    }),
  );
});
