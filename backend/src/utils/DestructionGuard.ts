import mongoose, { Schema } from 'mongoose';
import logger from '../config/logger';

/**
 * DestructionGuard
 * Protects critical collections against mass deletions via deleteMany({}).
 * In production, it blocks empty filters entirely and requires explicit bypass for large deletes.
 */
export const DestructionGuard = (schema: Schema) => {
  schema.pre('deleteMany', function () {
    const filter = this.getFilter();
    
    // Check if the filter is essentially empty (which means delete everything)
    const isEmptyFilter = Object.keys(filter).length === 0;

    if (isEmptyFilter) {
      const options = typeof (this as any).getOptions === 'function' ? (this as any).getOptions() : (this as any).options;
      if (!(options && options.bypassDestructionGuard === true)) {
        const errorMsg = `[DestructionGuard] FATAL: Blocked attempt to delete all documents in collection ${(this as any).mongooseCollection?.name}`;
        logger.error(errorMsg);

        // Asynchronously fire an alert
        try {
          const { AlertingService } = require('../services/AlertingService');
          AlertingService.securityAlert('Blocked Mass Deletion Attempt', {
            collection: (this as any).mongooseCollection?.name,
            filter,
            processId: process.pid,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          // Ignore
        }

        throw new Error(errorMsg);
      }
    } else {
      // If there's a filter, but no specific _id, it could be a mass delete.
      // We block it unless explicitly authorized via options.bypassDestructionGuard
      const options = typeof (this as any).getOptions === 'function' ? (this as any).getOptions() : (this as any).options;
      if (!filter._id && !(options && options.bypassDestructionGuard === true)) {
         const errorMsg = `[DestructionGuard] Blocked unauthorized mass deleteMany on ${(this as any).mongooseCollection?.name}. Missing bypassDestructionGuard option.`;
         logger.error(errorMsg);
         throw new Error(errorMsg);
      }
    }
  });

  // Block drop collection from schema methods if someone tries it
  schema.statics.drop = function () {
    if (process.env.NODE_ENV === 'production') {
       throw new Error(`[DestructionGuard] FATAL: Collection drop is strictly prohibited in production for ${this.collection.collectionName}.`);
    }
    return this.collection.drop();
  };
};
