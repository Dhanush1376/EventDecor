import mongoose from 'mongoose';
import Warehouse from '../models/Warehouse';
import { PickListService } from './PickListService';
import { PackageService } from './PackageService';
import { ScannerService } from './ScannerService';
import logger from '../../../config/logger';

export class WarehouseService {
  /**
   * Orchestrates the fulfillment sequence for a newly confirmed order
   */
  static async startOrderFulfillment(
    orderId: string,
    warehouseId: string,
    assignedWorkerId: string,
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Calculate and generate packages required
      const packages = await PackageService.autoPackOrder(orderId, session);

      // 2. Generate a picklist and assign to worker
      const pickList = await PickListService.generateForOrder(orderId, assignedWorkerId, session);

      await session.commitTransaction();

      logger.info(
        `Started fulfillment for order ${orderId}: Generated ${packages.length} packages and Picklist ${pickList.pickListId}`,
      );

      return {
        packages,
        pickList,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Processes a hardware scan from the warehouse floor
   */
  static async processHardwareScan(
    rawPayload: string,
    scannerId: string,
    workerId: string,
    location: any,
  ) {
    return await ScannerService.processScan(rawPayload, scannerId, workerId, location);
  }

  /**
   * Generates operational QR codes for warehouse zones (Locations)
   */
  static async generateZoneQRCodes(warehouseId: string) {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) throw new Error('Warehouse not found');

    // In a real system we'd generate stable QRs for every Aisle/Shelf/Bin
    // For now, this is a conceptual placeholder
    return warehouse.zones.map((zone) => ({
      zone: zone.name,
      qr: `LOC-${warehouse.code}-${zone.name}`, // Simplified
    }));
  }
}
