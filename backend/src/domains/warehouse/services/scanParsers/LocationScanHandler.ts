import mongoose from 'mongoose';
import { IScanHandler, IScanHandlerResult, ScanParserRegistry } from './ScanParserRegistry';
import { IScanEvent } from '../../types/scanEvent';

export class LocationScanHandler implements IScanHandler {
  prefix = 'LOC-';
  entityType = 'location' as const;

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    // For bin movements, cycle counts, etc.
    scanEvent.action = 'verify';
    await scanEvent.save({ session });
    return { success: true };
  }
}

ScanParserRegistry.register(new LocationScanHandler());
