import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { PrivacyService } from '../services/privacyService';

export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new ApiError(401, 'Authentication required');

  const data = await PrivacyService.exportUserData(userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="siri-arts-data-export-${userId}.json"`);
  res.status(200).json(new ApiResponse(true, 'Personal data export', data));
});

export const eraseMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { confirmEmail } = req.body;
  if (!userId) throw new ApiError(401, 'Authentication required');
  if (!confirmEmail) throw new ApiError(400, 'confirmEmail is required to erase your account');

  const result = await PrivacyService.eraseUserAccount(userId, confirmEmail);
  res.status(200).json(new ApiResponse(true, 'Account erased and anonymized', result));
});
