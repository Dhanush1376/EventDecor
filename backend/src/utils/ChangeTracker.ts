import VersionHistory from '../models/VersionHistory';
import logger from '../config/logger';

export class ChangeTracker {
  /**
   * Automatically track changes between old and new document states.
   */
  static async trackChange(
    entityType: string,
    entityId: any,
    oldDoc: any,
    newDoc: any,
    actor?: any,
    changeType: 'create' | 'update' | 'soft_delete' | 'restore' = 'update',
  ) {
    try {
      // Find the latest version number
      const latestVersion = await VersionHistory.findOne({ entityType, entityId })
        .sort({ version: -1 })
        .select('version')
        .lean();

      const versionNumber = (latestVersion?.version || 0) + 1;

      // Compute diff if it's an update
      let changes: any = undefined;
      if (oldDoc && newDoc && changeType === 'update') {
        changes = {};
        const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);
        for (const key of allKeys) {
          if (key === 'updatedAt' || key === 'createdAt') continue;

          if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newDoc[key])) {
            changes[key] = { previous: oldDoc[key], new: newDoc[key] };
          }
        }
        if (Object.keys(changes).length === 0) {
          changes = undefined; // Don't store empty changes
        }
      }

      await VersionHistory.create({
        entityType,
        entityId,
        version: versionNumber,
        data: newDoc,
        changes,
        changeType,
        changedBy: actor
          ? {
              userId: actor.id || actor._id?.toString(),
              email: actor.email,
              role: actor.role,
            }
          : undefined,
      });
    } catch (err: any) {
      logger.error(
        `[ChangeTracker] Failed to track change for ${entityType} ${entityId}: ${err.message}`,
      );
    }
  }

  static async getHistory(entityType: string, entityId: string) {
    return VersionHistory.find({ entityType, entityId }).sort({ version: -1 }).lean();
  }

  static async getVersion(entityType: string, entityId: string, version: number) {
    return VersionHistory.findOne({ entityType, entityId, version }).lean();
  }
}
