import { Request, Response } from 'express';
import Serviceability from '../../models/Serviceability';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';

/**
 * @desc    Get all serviceability locations
 * @route   GET /api/v1/admin/serviceability
 * @access  Private/Admin
 */
export const getServiceabilityAdmin = asyncHandler(async (req: Request, res: Response) => {
  const locations = await Serviceability.find().sort({ locationName: 1 });
  res.status(200).json({
    success: true,
    count: locations.length,
    data: locations,
  });
});

/**
 * @desc    Update a serviceability location
 * @route   PATCH /api/v1/admin/serviceability/:locationCode
 * @access  Private/Admin
 */
export const updateServiceabilityAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { locationCode } = req.params;
  const { enabled, baseTravelFee, freeTravelDistanceKm, perKmRate, stateSurcharge } = req.body;

  const location = await Serviceability.findOne({ locationCode });

  if (!location) {
    throw new ApiError(404, `Serviceability location with code ${locationCode} not found`);
  }

  // Validate numeric values are not negative
  if (baseTravelFee !== undefined && baseTravelFee < 0)
    throw new ApiError(400, 'Base Travel Fee cannot be negative');
  if (freeTravelDistanceKm !== undefined && freeTravelDistanceKm < 0)
    throw new ApiError(400, 'Free Travel Distance cannot be negative');
  if (perKmRate !== undefined && perKmRate < 0)
    throw new ApiError(400, 'Per KM Rate cannot be negative');
  if (stateSurcharge !== undefined && stateSurcharge < 0)
    throw new ApiError(400, 'State Surcharge cannot be negative');

  if (enabled !== undefined) location.enabled = enabled;
  if (baseTravelFee !== undefined) location.baseTravelFee = baseTravelFee;
  if (freeTravelDistanceKm !== undefined) location.freeTravelDistanceKm = freeTravelDistanceKm;
  if (perKmRate !== undefined) location.perKmRate = perKmRate;
  if (stateSurcharge !== undefined) location.stateSurcharge = stateSurcharge;

  await location.save();

  res.status(200).json({
    success: true,
    data: location,
  });
});
