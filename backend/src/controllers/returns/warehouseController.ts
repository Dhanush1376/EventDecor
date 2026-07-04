import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { WarehouseInspectionService } from '../../services/returns/WarehouseInspectionService';
import ReturnRequest from '../../models/ReturnRequest';
import ApiError from '../../utils/ApiError';

/**
 * @desc    Mark a returned item as received at warehouse
 * @route   PATCH /api/v1/returns/warehouse/:id/items/:itemIndex/receive
 * @access  Admin/Warehouse
 */
export const markItemReceived = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const itemIndex = parseInt(req.params.itemIndex as string);

  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await WarehouseInspectionService.recordReceipt(
    req.params.id as string,
    itemIndex,
    adminId,
  );

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Submit inspection checklist for an item
 * @route   PATCH /api/v1/returns/warehouse/:id/items/:itemIndex/inspect
 * @access  Admin/Warehouse
 */
export const submitInspection = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const itemIndex = parseInt(req.params.itemIndex as string);
  const checklist = req.body;

  if (!adminId) throw new ApiError(401, 'Unauthorized');

  const returnRequest = await WarehouseInspectionService.submitInspectionChecklist(
    req.params.id as string,
    itemIndex,
    checklist,
    adminId,
  );

  res.status(200).json({
    success: true,
    data: returnRequest,
  });
});

/**
 * @desc    Get inspection queue
 * @route   GET /api/v1/returns/warehouse/queue
 * @access  Admin/Warehouse
 */
export const getInspectionQueue = asyncHandler(async (req: Request, res: Response) => {
  const returns = await ReturnRequest.find({
    status: { $in: ['return_picked_up', 'return_received', 'inspection_started'] },
    'items.warehouseStatus': { $in: ['pending', 'received'] },
  })
    .populate('orderId', 'orderStatus')
    .sort({ createdAt: 1 }); // Oldest first

  res.status(200).json({
    success: true,
    data: returns,
    count: returns.length,
  });
});
