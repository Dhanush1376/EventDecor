import { Request, Response } from 'express';
import AnalyticsService from '../services/analyticsService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import AdminAuditLog from '../models/AdminAuditLog';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { setPaginationHeaders } from '../utils/paginationHeaders';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await AnalyticsService.getDashboardStats();
  res.status(200).json(new ApiResponse(true, 'Dashboard stats', stats));
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);

  const [logs, totalCount] = await Promise.all([
    AdminAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminAuditLog.countDocuments(),
  ]);

  setPaginationHeaders(res, totalCount, page, limit);
  res.status(200).json(
    new ApiResponse(true, 'Audit logs retrieved', formatPaginationResponse(logs, totalCount, page, limit))
  );
});

export const createAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { action, details, status } = req.body;
  const newLog = await AdminAuditLog.create({
    actorId: req.user?.id,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    method: 'CLIENT_ACTION',
    path: action,
    statusCode: status === 'Success' ? 200 : 400,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.status(201).json(new ApiResponse(true, 'Audit log created', newLog));
});

export const clearAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  // Production Safety: Audit logs must never be cleared.
  res.status(403).json(new ApiResponse(false, 'Forbidden: Audit logs are permanent and cannot be cleared for compliance and data safety reasons.', {}));
});
