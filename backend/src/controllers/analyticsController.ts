import { Request, Response } from 'express';
import AnalyticsService from '../services/analyticsService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await AnalyticsService.getDashboardStats();
  res.status(200).json(new ApiResponse(true, 'Dashboard stats', stats));
});
