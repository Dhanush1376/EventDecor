import { Request, Response } from 'express';
import AnalyticsService from '../../services/analyticsService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import AdminAuditLog from '../../models/AdminAuditLog';
import Order from '../../models/Order';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { setPaginationHeaders } from '../../utils/paginationHeaders';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await AnalyticsService.getDashboardStats();
  res.status(200).json(new ApiResponse(true, 'Dashboard stats', stats));
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);

  const [logs, orders, logsCount, ordersCount] = await Promise.all([
    AdminAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id customerName total createdAt')
      .lean(),
    AdminAuditLog.countDocuments(),
    Order.countDocuments(),
  ]);

  const combinedLogs = [
    ...orders.map((o: any) => ({
      _id: o._id,
      actorRole: 'CUSTOMER',
      actorEmail: o.customerName || 'Customer',
      action: `Customer Order placed for ₹${o.total}`,
      method: 'SYSTEM_ACTION',
      path: '/api/v1/orders',
      statusCode: 200,
      createdAt: o.createdAt,
    })),
    ...logs,
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Since we are merging two paginated sets loosely on the backend,
  // we just return the combined slice that matches limit, and sum the total count.
  const totalCount = logsCount + ordersCount;
  const finalSlice = combinedLogs.slice(0, limit);

  setPaginationHeaders(res, totalCount, page, limit);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Audit logs retrieved',
        formatPaginationResponse(finalSlice, totalCount, page, limit),
      ),
    );
});

export const createAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { action, _details, status } = req.body;
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
  res
    .status(403)
    .json(
      new ApiResponse(
        false,
        'Forbidden: Audit logs are permanent and cannot be cleared for compliance and data safety reasons.',
        {},
      ),
    );
});
