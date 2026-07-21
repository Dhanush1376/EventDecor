import mongoose from 'mongoose';
import { IScanHandler, IScanHandlerResult, ScanParserRegistry } from './ScanParserRegistry';
import { IScanEvent } from '../../types/scanEvent';

export class OperationalScanHandler implements IScanHandler {
  prefix = null; // Decoded from QR
  entityType = 'operational' as const;

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    const payload = scanEvent.metadata?.decodedPayload;
    if (!payload) return { success: false, errorMessage: 'Invalid operational payload' };

    if (payload.action === 'start_picking') {
      const PickList = require('../../models/PickList').default;
      const pickList = await PickList.findOne({ pickListId: payload.entityId }).session(session);
      if (!pickList) return { success: false, errorMessage: 'Picklist not found' };

      pickList.status = 'in_progress';
      pickList.startedAt = new Date();
      await pickList.save({ session });
      return { success: true };
    }

    return { success: false, errorMessage: `Unknown operational action: ${payload.action}` };
  }
}

ScanParserRegistry.register(new OperationalScanHandler());
