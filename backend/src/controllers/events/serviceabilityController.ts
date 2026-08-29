import { Request, Response } from 'express';
import Serviceability from '../../models/Serviceability';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { TravelDistanceService } from '../../services/eventBooking/TravelDistanceService';
import { TravelExpenseService } from '../../services/eventBooking/TravelExpenseService';

/**
 * @desc    Get all serviceability locations
 * @route   GET /api/v1/event-bookings/serviceability/locations
 * @access  Public
 */
export const getServiceableLocations = asyncHandler(async (req: Request, res: Response) => {
  const locations = await Serviceability.find({}, 'locationCode locationName type enabled').sort({
    locationName: 1,
  });

  res.status(200).json({
    success: true,
    data: locations,
  });
});

/**
 * @desc    Get specific location details
 * @route   GET /api/v1/event-bookings/serviceability/:locationCode
 * @access  Public
 */
export const getLocationDetails = asyncHandler(async (req: Request, res: Response) => {
  const { locationCode } = req.params;
  const location = await Serviceability.findOne(
    { locationCode },
    'locationCode locationName type enabled',
  );

  if (!location) {
    throw new ApiError(
      404,
      "We're sorry! Our event decoration services are currently unavailable at this location. Please select another serviceable location or contact our team for assistance.",
    );
  }

  res.status(200).json({
    success: true,
    data: location,
  });
});

/**
 * @desc    Estimate travel expense
 * @route   POST /api/v1/event-bookings/travel-expense/estimate
 * @access  Public
 */
export const estimateTravelExpense = asyncHandler(async (req: Request, res: Response) => {
  const { locationCode, city, address } = req.body;

  if (!locationCode) {
    throw new ApiError(400, 'locationCode is required to estimate travel expense');
  }

  const serviceability = await Serviceability.findOne({ locationCode });

  if (!serviceability || !serviceability.enabled) {
    throw new ApiError(
      400,
      "We're sorry! Our event decoration services are currently unavailable at this location. Please select another serviceable location or contact our team for assistance.",
    );
  }

  const destination =
    `${address || ''}, ${city || ''}, ${serviceability.locationName}, India`.trim();
  const distanceKm = await TravelDistanceService.calculateDistance(destination);

  const expense = TravelExpenseService.calculate(
    distanceKm,
    serviceability.baseTravelFee,
    serviceability.freeTravelDistanceKm,
    serviceability.perKmRate,
    serviceability.stateSurcharge,
  );

  res.status(200).json({
    success: true,
    data: expense,
  });
});
