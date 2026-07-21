import mongoose from 'mongoose';
import { IScanEvent } from '../types/scanEvent';
import logger from '../../../config/logger';
import { ScanParserRegistry } from './scanParsers';

export class ScanPipeline {
  /**
   * Routes a verified ScanEvent to the correct business logic handler
   */
  static async process(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      const handler = ScanParserRegistry.getHandlerForType(scanEvent.entityType);

      if (!handler) {
        return {
          success: false,
          errorMessage: `No handler registered for entity type: ${scanEvent.entityType}`,
        };
      }

      return await handler.handle(scanEvent, session);
    } catch (error: any) {
      logger.error('Pipeline process error:', error);
      return { success: false, errorMessage: error.message };
    }
  }
}
