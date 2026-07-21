import mongoose from 'mongoose';
import { IScanEvent } from '../../types/scanEvent';

export interface IScanHandlerResult {
  success: boolean;
  errorMessage?: string;
}

export interface IScanHandler {
  prefix: string | null; // null means it handles QR payload only (or generic fallback, but we avoid fallback)
  entityType: IScanEvent['entityType'];
  handle(scanEvent: IScanEvent, session: mongoose.ClientSession): Promise<IScanHandlerResult>;
}

export class ScanParserRegistry {
  private static handlers: IScanHandler[] = [];

  static register(handler: IScanHandler) {
    this.handlers.push(handler);
  }

  static getHandlerForPrefix(rawValue: string): IScanHandler | null {
    // Find the longest matching prefix (e.g., to distinguish PKG- from PKG-RTN- if needed)
    let bestMatch: IScanHandler | null = null;
    let longestPrefix = 0;

    for (const handler of this.handlers) {
      if (handler.prefix && rawValue.startsWith(handler.prefix)) {
        if (handler.prefix.length > longestPrefix) {
          bestMatch = handler;
          longestPrefix = handler.prefix.length;
        }
      }
    }
    return bestMatch;
  }

  static getHandlerForType(type: IScanEvent['entityType']): IScanHandler | null {
    return this.handlers.find((h) => h.entityType === type) || null;
  }
}
