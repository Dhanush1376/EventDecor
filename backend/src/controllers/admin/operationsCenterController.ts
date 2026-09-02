import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { Transaction } from '../../models/Transaction';
import Invoice from '../../models/Invoice';
import Fulfilment from '../../models/Fulfilment';

export const getOperationsDashboard = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalTransactions,
    recentTransactions,
    pendingFulfillments,
    activeRentals,
    inProductionCustomOrders,
    unpaidInvoices,
  ] = await Promise.all([
    Transaction.countDocuments(),
    Transaction.find().sort({ createdAt: -1 }).limit(10).populate('customer', 'name email').lean(),
    Fulfilment.countDocuments({ status: { $in: ['PENDING', 'PROCESSING'] } }),
    Transaction.countDocuments({ domain: 'rental', canonicalStatus: 'RENTAL_ACTIVE' }),
    Transaction.countDocuments({ domain: 'custom', canonicalStatus: 'IN_PRODUCTION' }),
    Invoice.countDocuments({ status: { $in: ['DRAFT', 'ISSUED'] } }),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Operations center dashboard data fetched', {
      metrics: {
        totalTransactions,
        pendingFulfillments,
        activeRentals,
        inProductionCustomOrders,
        unpaidInvoices,
      },
      recentTransactions,
    }),
  );
});
