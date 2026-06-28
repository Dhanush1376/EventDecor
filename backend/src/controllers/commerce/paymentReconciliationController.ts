import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { PaymentReconciliationService } from '../../services/paymentReconciliationService';
import logger from '../../config/logger';

export const getPaymentReconciliationReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await PaymentReconciliationService.runReport();
  res.status(200).json(new ApiResponse(true, 'Payment reconciliation report', report));
});

export const triggerDeepReconciliation = asyncHandler(async (req: Request, res: Response) => {
  const { runPaymentReconciliation } = require('../../jobs/PaymentReconciliationJob');
  // Run asynchronously in the background so we don't block the API response
  runPaymentReconciliation().catch((err: any) => {
    logger.error('Deep reconciliation background job failed:', err);
  });
  res.status(200).json(new ApiResponse(true, 'Deep reconciliation job started in the background'));
});
