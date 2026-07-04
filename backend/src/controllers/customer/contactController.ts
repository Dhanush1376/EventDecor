import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { CustomerContactService } from '../../services/CustomerContactService';

export const resolveContact = asyncHandler(async (req: Request, res: Response) => {
  const result = await CustomerContactService.resolveContact(req.user!.id);
  res.status(200).json(new ApiResponse(true, 'Contact resolved', result));
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  await CustomerContactService.updatePhone(req.user!.id, phone);
  res.status(200).json(new ApiResponse(true, 'Phone number updated successfully'));
});
