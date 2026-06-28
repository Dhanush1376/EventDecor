import { Request, Response } from 'express';
import RentalService from '../../services/rentalService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';

// ─── Customer Endpoints ───

export const calculateRentalCost = asyncHandler(async (req: Request, res: Response) => {
  const { productId, startDate, endDate } = req.body;
  const result = await RentalService.calculateRentalCost(productId, startDate, endDate);
  res.status(200).json(new ApiResponse(true, 'Rental cost calculated', result));
});

export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { productId, startDate, endDate } = req.body;
  const result = await RentalService.checkAvailability(productId, startDate, endDate);
  res.status(200).json(new ApiResponse(true, 'Availability checked', result));
});

export const checkServiceArea = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  const result = await RentalService.checkServiceArea(lat, lng);
  res.status(200).json(new ApiResponse(true, 'Service area checked', result));
});

export const createRentalOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.createRentalOrder(req.body, req.user.id);
  res.status(201).json(new ApiResponse(true, 'Rental order created', result));
});

export const verifyRentalPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.verifyRentalPayment(req.body, req.user.id);
  res.status(200).json(new ApiResponse(true, 'Rental payment verified', result));
});

export const getMyRentals = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.getMyRentals(req.user.id, req.query);
  res.status(200).json(new ApiResponse(true, 'Rentals fetched', result));
});

export const getRentalDetail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.getRentalDetail(req.params.id as string, req.user.id);
  res.status(200).json(new ApiResponse(true, 'Rental detail fetched', result));
});

export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.requestReturn(req.params.id as string, req.user.id);
  res.status(200).json(new ApiResponse(true, 'Return request submitted', result));
});

export const cancelRental = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.cancelRentalOrder(req.params.id as string, req.user.id);
  res.status(200).json(new ApiResponse(true, 'Rental cancelled', result));
});

// ─── Admin Endpoints ───

export const getAllRentals = asyncHandler(async (req: Request, res: Response) => {
  const result = await RentalService.getAllRentals(req.query);
  res.status(200).json(new ApiResponse(true, 'All rental orders fetched', result));
});

export const getAdminRentalDetail = asyncHandler(async (req: Request, res: Response) => {
  const result = await RentalService.getRentalDetail(req.params.id as string);
  res.status(200).json(new ApiResponse(true, 'Rental detail fetched', result));
});

export const updateRentalStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const { status, note } = req.body;
  const result = await RentalService.updateRentalStatus(
    req.params.id as string,
    status,
    note || '',
    req.user.id,
  );
  res.status(200).json(new ApiResponse(true, 'Rental status updated', result));
});

export const processInspection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.processReturn(req.params.id as string, req.body, req.user.id);
  res.status(200).json(new ApiResponse(true, 'Inspection processed and return completed', result));
});

export const releaseDeposit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const { amount, reason } = req.body;
  const result = await RentalService.releaseDeposit(
    req.params.id as string,
    amount,
    reason,
    req.user.id,
  );
  res.status(200).json(new ApiResponse(true, 'Deposit released', result));
});

export const getProductCalendar = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const result = await RentalService.getProductCalendar(
    req.params.productId as string,
    month ? Number(month) : undefined,
    year ? Number(year) : undefined,
  );
  res.status(200).json(new ApiResponse(true, 'Calendar fetched', result));
});

export const getRentalAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await RentalService.getRentalAnalytics();
  res.status(200).json(new ApiResponse(true, 'Rental analytics fetched', result));
});

export const adminCancelRental = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const result = await RentalService.cancelRentalOrder(req.params.id as string, req.user.id, true);
  res.status(200).json(new ApiResponse(true, 'Rental cancelled by admin', result));
});
