import mongoose from 'mongoose';
import { IScanHandler, IScanHandlerResult, ScanParserRegistry } from './ScanParserRegistry';
import { IScanEvent } from '../../types/scanEvent';
import { PickListService } from '../PickListService';
import logger from '../../../../config/logger';

export class ProductScanHandler implements IScanHandler {
  prefix = null; // Products are scanned via QR code which doesn't rely on raw prefix matching
  entityType = 'product' as const;

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    const PickList = require('../../models/PickList').default;
    const activePickList = await PickList.findOne({
      assignedTo: scanEvent.scannedBy.userId,
      status: { $in: ['assigned', 'in_progress'] },
    }).session(session);

    if (activePickList) {
      let sku = scanEvent.rawValue;
      if (scanEvent.metadata?.decodedPayload?.sku) {
        sku = scanEvent.metadata.decodedPayload.sku;
      }

      await PickListService.updatePickedItem(
        activePickList.pickListId,
        sku,
        1,
        scanEvent.scannedBy.userId?.toString() || 'system',
      );

      // Analytics & Socket
      try {
        const { emitUserEvent } = require('../../../../socket');
        emitUserEvent(`warehouse_room`, 'item_picked', {
          pickListId: activePickList.pickListId,
          sku,
        });
      } catch (e) {
        logger.warn('Socket emit failed', e);
      }

      scanEvent.action = 'pick';
      await scanEvent.save({ session });
      return { success: true };
    }

    return { success: false, errorMessage: 'Worker has no active picklist for this product' };
  }
}

ScanParserRegistry.register(new ProductScanHandler());
