import { Request, Response } from 'express';
import ServiceArea from '../models/ServiceArea';
import RentalService from '../services/rentalService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

export const getServiceAreas = asyncHandler(async (req: Request, res: Response) => {
  const areas = await ServiceArea.find().sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(true, 'Service areas fetched', areas));
});

export const createServiceArea = asyncHandler(async (req: Request, res: Response) => {
  const area = await ServiceArea.create(req.body);
  res.status(201).json(new ApiResponse(true, 'Service area created', area));
});

export const updateServiceArea = asyncHandler(async (req: Request, res: Response) => {
  const area = await ServiceArea.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!area) throw new ApiError(404, 'Service area not found');
  res.status(200).json(new ApiResponse(true, 'Service area updated', area));
});

export const deleteServiceArea = asyncHandler(async (req: Request, res: Response) => {
  const area = await ServiceArea.findByIdAndDelete(req.params.id);
  if (!area) throw new ApiError(404, 'Service area not found');
  res.status(200).json(new ApiResponse(true, 'Service area deleted'));
});

export const checkServiceArea = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  const result = await RentalService.checkServiceArea(lat, lng);
  res.status(200).json(new ApiResponse(true, 'Service area checked', result));
});
