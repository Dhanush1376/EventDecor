import mongoose, { Schema } from 'mongoose';
import logger from '../config/logger';

/**
 * DestructionGuard
 * Protects critical collections against mass deletions via deleteMany({}).
 * In production, it blocks empty filters entirely.
 */
export const DestructionGuard = (schema: Schema) => {
  schema.pre('deleteMany', function () {
    const filter = this.getFilter();

    // Check if the filter is essentially empty (which means delete everything)
    const isEmptyFilter = Object.keys(filter).length === 0;

    if (isEmptyFilter) {
      if (process.env.NODE_ENV === 'production') {
        const errorMsg = `[DestructionGuard] Blocked attempt to delete all documents in collection ${(this as any).mongooseCollection?.name}`;
        logger.error(errorMsg);

        // Asynchronously fire an alert
        try {
          const { AlertingService } = require('../services/AlertingService');
          AlertingService.securityAlert('Blocked Mass Deletion Attempt', {
            collection: (this as any).mongooseCollection?.name,
            filter,
          });
        } catch (e) {
          // Ignore
        }

        throw new Error(errorMsg);
      } else {
        logger.warn(
          `[DestructionGuard] Allowed empty deleteMany on ${(this as any).mongooseCollection?.name} because NODE_ENV is not production.`,
        );
      }
    }
  });
};
