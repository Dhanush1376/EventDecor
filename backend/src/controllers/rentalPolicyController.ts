import { Request, Response } from 'express';
import RentalPolicy from '../models/RentalPolicy';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

export const getRentalPolicy = asyncHandler(async (req: Request, res: Response) => {
  let policy = await RentalPolicy.findOne({ isActive: true }).lean();

  // Auto-create default policy if none exists
  if (!policy) {
    policy = await RentalPolicy.create({
      lateReturnFeePerDay: 100,
      damagePolicy: { minor: 200, major: 1000, complete: 0 },
      lostProductPolicy: { type: 'full_cost', percentage: 100 },
      cancellationPolicy: { freeCancelHours: 24, postConfirmChargePercent: 50 },
      returnConditions: [
        'Must return with all accessories',
        'Original packaging required',
        'Product must be cleaned',
      ],
      requiredDocuments: [],
      identityVerificationRequired: false,
      termsAndConditions: '',
      isActive: true,
    });
  }

  res.status(200).json(new ApiResponse(true, 'Rental policy fetched', policy));
});

export const updateRentalPolicy = asyncHandler(async (req: Request, res: Response) => {
  let policy = await RentalPolicy.findOne({ isActive: true });

  if (!policy) {
    policy = new RentalPolicy({ ...req.body, isActive: true });
  } else {
    Object.assign(policy, req.body);
  }

  await policy.save();
  res.status(200).json(new ApiResponse(true, 'Rental policy updated', policy));
});
