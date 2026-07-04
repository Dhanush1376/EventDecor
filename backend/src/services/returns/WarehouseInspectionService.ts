import mongoose from 'mongoose';
import ReturnRequest from '../../models/ReturnRequest';
import ApiError from '../../utils/ApiError';

export class WarehouseInspectionService {
  /**
   * Marks a returned item as received at the warehouse.
   */
  static async recordReceipt(returnId: string, itemIndex: number, adminId: string) {
    const request = await ReturnRequest.findById(returnId);
    if (!request) throw new ApiError(404, 'Return request not found');

    if (!request.items[itemIndex]) {
      throw new ApiError(404, 'Item not found in return request');
    }

    request.items[itemIndex].warehouseStatus = 'received';

    // Check if all items are received to update master status
    const allReceived = request.items.every((i) =>
      [
        'received',
        'quality_passed',
        'rejected',
        'restocked',
        'damaged_inventory',
        'repair_required',
      ].includes(i.warehouseStatus),
    );

    if (allReceived && request.status !== 'return_received') {
      request.status = 'return_received';
      request.sla = {
        currentStage: 'return_received',
        stageEnteredAt: new Date(),
        isOverdue: false,
        escalated: false,
      };

      request.timeline.push({
        action: 'Warehouse Receipt',
        description: 'All items received at warehouse',
        performedBy: new mongoose.Types.ObjectId(adminId),
        timestamp: new Date(),
      });
    }

    await request.save();
    return request;
  }

  /**
   * Submits inspection checklist for a specific item.
   */
  static async submitInspectionChecklist(
    returnId: string,
    itemIndex: number,
    checklist: {
      originalProduct: boolean;
      accessoriesPresent: boolean;
      packagingIntact: boolean;
      workingCondition: boolean;
      photos?: string[];
      remarks?: string;
      inspectionScore: number;
    },
    adminId: string,
  ) {
    const request = await ReturnRequest.findById(returnId);
    if (!request) throw new ApiError(404, 'Return request not found');

    if (!request.items[itemIndex]) {
      throw new ApiError(404, 'Item not found in return request');
    }

    // Ensure item was received
    if (
      !request.items[itemIndex].warehouseStatus ||
      request.items[itemIndex].warehouseStatus === 'pending'
    ) {
      request.items[itemIndex].warehouseStatus = 'received';
    }

    request.items[itemIndex].inspectionResult = {
      ...checklist,
      photos: checklist.photos || [],
      inspectedBy: new mongoose.Types.ObjectId(adminId),
      inspectedAt: new Date(),
    };

    // Auto-update warehouse status based on score
    if (checklist.inspectionScore >= 80) {
      request.items[itemIndex].warehouseStatus = 'quality_passed';
    } else if (checklist.inspectionScore < 30) {
      request.items[itemIndex].warehouseStatus = 'rejected';
    } else {
      request.items[itemIndex].warehouseStatus = 'repair_required';
    }

    request.timeline.push({
      action: 'Item Inspected',
      description: `Item ${itemIndex + 1} inspected. Score: ${checklist.inspectionScore}`,
      performedBy: new mongoose.Types.ObjectId(adminId),
      timestamp: new Date(),
    });

    await request.save();
    return request;
  }
}
