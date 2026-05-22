import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { PaymentReconciliationService } from '../services/paymentReconciliationService';

export const getPaymentReconciliationReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await PaymentReconciliationService.runReport();
  res.status(200).json(new ApiResponse(true, 'Payment reconciliation report', report));
});
