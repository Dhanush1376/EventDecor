import { Request, Response } from 'express';
import Location from '../../models/Location';
import ApiError from '../../utils/ApiError';
import ApiResponse from '../../utils/ApiResponse';
import asyncHandler from '../../utils/asyncHandler';

export const getLocations = asyncHandler(async (req: Request, res: Response) => {
  const locations = await Location.find();
  res.status(200).json(new ApiResponse(true, 'Locations fetched successfully', locations));
});

export const getLocationBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const location = await Location.findOne({ slug });

  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  res.status(200).json(new ApiResponse(true, 'Location fetched successfully', location));
});

// Admin routes
export const createLocation = asyncHandler(async (req: Request, res: Response) => {
  const location = await Location.create(req.body);
  res.status(201).json(new ApiResponse(true, 'Location created successfully', location));
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const location = await Location.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  res.status(200).json(new ApiResponse(true, 'Location updated successfully', location));
});

export const deleteLocation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const location = await Location.findByIdAndDelete(id);

  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  res.status(200).json(new ApiResponse(true, 'Location deleted successfully', null));
});
