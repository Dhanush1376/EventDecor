import mongoose from 'mongoose';
import RecycleBin, { ICleanupReportItem } from '../models/RecycleBin';
import { AdminAuditService } from './AdminAuditService';
import { CloudinaryAdapter } from './media/CloudinaryAdapter';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import logger from '../config/logger';

// -------------------------------------------------------------------
// Entity type → Mongoose model name mapping
// -------------------------------------------------------------------
const ENTITY_MODEL_MAP: Record<string, string> = {
  Product: 'Product',
  Category: 'Category',
  Review: 'Review',
  Order: 'Order',
  Gallery: 'Gallery',
  Event: 'Event',
  Media: 'Media',
  User: 'User',
  ShowcaseCollection: 'ShowcaseCollection',
  CustomOrder: 'CustomOrder',
  ExchangeRequest: 'ExchangeRequest',
  ReturnRequest: 'ReturnRequest',
  InventoryLedger: 'InventoryLedger',
  InventoryReservation: 'InventoryReservation',
  Coupon: 'Coupon',
  Blog: 'Blog',
  ContentSection: 'ContentSection',
  InAppNotification: 'InAppNotification',
  RewardCampaign: 'RewardCampaign',
  EmailCampaign: 'EmailCampaign',
  ServiceArea: 'ServiceArea',
  Location: 'Location',
};

// Entity type → display name mapping
const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  Product: 'Product',
  Category: 'Category',
  Review: 'Review',
  Order: 'Order',
  Gallery: 'Gallery Item',
  Event: 'Event',
  Media: 'Media Asset',
  User: 'Customer',
  ShowcaseCollection: 'Showcase Collection',
  CustomOrder: 'Custom Order',
  Coupon: 'Coupon',
  Blog: 'Blog Post',
  ContentSection: 'Content Section',
  InAppNotification: 'Notification',
  RewardCampaign: 'Reward Campaign',
  EmailCampaign: 'Email Campaign',
  ServiceArea: 'Service Area',
  Location: 'Location',
};

// Unique-field names per entity type, used for conflict detection during restore
const UNIQUE_FIELDS: Record<string, string[]> = {
  Product: ['slug', 'sku', 'barcode'],
  Category: ['slug'],
  Coupon: ['code'],
  Blog: ['slug', 'id'],
  ShowcaseCollection: [],
  Gallery: [],
};

interface RecycleBinListParams {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  status?: string;
  deletedBy?: string;
  timeRange?: 'today' | '7days' | '30days' | 'expiring_soon' | 'expired';
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

interface RestoreConflict {
  field: string;
  existingValue: string;
  conflictingDocumentId: string;
}

interface RestoreResult {
  success: boolean;
  conflicts?: RestoreConflict[];
  restoredEntity?: any;
  dependencyWarnings?: {
    entityType: string;
    entityId: string;
    entityName: string;
    recycleBinId?: string;
    status: 'deleted' | 'missing';
  }[];
}

interface CleanupResult {
  success: boolean;
  report: ICleanupReportItem[];
  errors: string[];
}

export class RecycleBinService {
  // ─────────────────────────────────────────────────────────────
  //  LIST / SEARCH / FILTER
  // ─────────────────────────────────────────────────────────────

  static async getAll(params: RecycleBinListParams) {
    const { page, limit, skip } = getPaginationOptions(params as any);

    const filter: any = { status: 'deleted' };

    // Entity type filter
    if (params.entityType && params.entityType !== 'all') {
      filter.entityType = params.entityType;
    }

    // Deleted by filter
    if (params.deletedBy) {
      filter['deletedBy.userId'] = params.deletedBy;
    }

    // Time range filter
    if (params.timeRange) {
      const now = new Date();
      switch (params.timeRange) {
        case 'today': {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          filter.deletedAt = { $gte: startOfDay };
          break;
        }
        case '7days': {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filter.deletedAt = { $gte: sevenDaysAgo };
          break;
        }
        case '30days': {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filter.deletedAt = { $gte: thirtyDaysAgo };
          break;
        }
        case 'expiring_soon': {
          const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          filter.scheduledPurgeAt = { $lte: threeDaysFromNow, $gt: now };
          break;
        }
        case 'expired': {
          filter.scheduledPurgeAt = { $lte: now };
          break;
        }
      }
    }

    // Text search
    if (params.search) {
      const searchRegex = new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { entityName: searchRegex },
        { entityType: searchRegex },
        { 'deletedBy.email': searchRegex },
      ];
    }

    // Sorting
    let sortOptions: any = { deletedAt: -1 };
    if (params.sort) {
      const direction = params.sortOrder === 'asc' ? 1 : -1;
      switch (params.sort) {
        case 'name':
          sortOptions = { entityName: direction };
          break;
        case 'type':
          sortOptions = { entityType: direction };
          break;
        case 'deletedAt':
          sortOptions = { deletedAt: direction };
          break;
        case 'expiresAt':
          sortOptions = { scheduledPurgeAt: direction };
          break;
        case 'deletedBy':
          sortOptions = { 'deletedBy.email': direction };
          break;
      }
    }

    const [items, totalCount] = await Promise.all([
      RecycleBin.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
      RecycleBin.countDocuments(filter),
    ]);

    // Compute dynamic fields
    const now = new Date();
    const enrichedItems = items.map((item) => ({
      ...item,
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (new Date(item.scheduledPurgeAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      ),
      isExpired: new Date(item.scheduledPurgeAt) <= now,
      entityTypeDisplay: ENTITY_DISPLAY_NAMES[item.entityType] || item.entityType,
    }));

    return formatPaginationResponse(enrichedItems, totalCount, page, limit);
  }

  // ─────────────────────────────────────────────────────────────
  //  GET BY ID (with full entity data for preview)
  // ─────────────────────────────────────────────────────────────

  static async getById(id: string) {
    const entry = await RecycleBin.findById(id).lean();
    if (!entry) return null;

    const now = new Date();
    return {
      ...entry,
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (new Date(entry.scheduledPurgeAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      ),
      isExpired: new Date(entry.scheduledPurgeAt) <= now,
      entityTypeDisplay: ENTITY_DISPLAY_NAMES[entry.entityType] || entry.entityType,
    };
  }

  // ─────────────────────────────────────────────────────────────
  //  STATS (Dashboard + Analytics)
  // ─────────────────────────────────────────────────────────────

  static async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfNextWeek = new Date(startOfToday.getTime() + 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalDeleted,
      expiringToday,
      expiringTomorrow,
      expiringThisWeek,
      expiringNextWeek,
      expiredCount,
      recentlyDeleted,
      restoredThisMonth,
      autoPurgedThisMonth,
      entityBreakdown,
      topDeleters,
    ] = await Promise.all([
      RecycleBin.countDocuments({ status: 'deleted' }),
      RecycleBin.countDocuments({
        status: 'deleted',
        scheduledPurgeAt: { $gte: startOfToday, $lt: startOfTomorrow },
      }),
      RecycleBin.countDocuments({
        status: 'deleted',
        scheduledPurgeAt: {
          $gte: startOfTomorrow,
          $lt: new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000),
        },
      }),
      RecycleBin.countDocuments({
        status: 'deleted',
        scheduledPurgeAt: { $gte: startOfToday, $lt: endOfWeek },
      }),
      RecycleBin.countDocuments({
        status: 'deleted',
        scheduledPurgeAt: { $gte: endOfWeek, $lt: endOfNextWeek },
      }),
      RecycleBin.countDocuments({
        status: 'deleted',
        scheduledPurgeAt: { $lte: now },
      }),
      RecycleBin.find({ status: 'deleted' })
        .sort({ deletedAt: -1 })
        .limit(5)
        .select('entityName entityType entityThumbnail deletedAt deletedBy')
        .lean(),
      RecycleBin.countDocuments({
        status: 'restored',
        restoredAt: { $gte: thirtyDaysAgo },
      }),
      RecycleBin.countDocuments({
        status: 'purged',
        purgedAt: { $gte: thirtyDaysAgo },
      }),
      // Entity type breakdown
      RecycleBin.aggregate([
        { $match: { status: 'deleted' } },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Top deleters
      RecycleBin.aggregate([
        { $match: { status: 'deleted', 'deletedBy.email': { $exists: true } } },
        { $group: { _id: '$deletedBy.email', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Find the most deleted entity type
    const mostDeletedEntity = entityBreakdown.length > 0 ? entityBreakdown[0] : null;

    return {
      totalDeleted,
      expiringToday,
      expiringTomorrow,
      expiringThisWeek,
      expiringNextWeek,
      expiredCount,
      recentlyDeleted,
      restoredThisMonth,
      autoPurgedThisMonth,
      entityBreakdown: entityBreakdown.map((e) => ({
        type: e._id,
        displayName: ENTITY_DISPLAY_NAMES[e._id] || e._id,
        count: e.count,
      })),
      mostDeletedEntity: mostDeletedEntity
        ? {
            type: mostDeletedEntity._id,
            displayName: ENTITY_DISPLAY_NAMES[mostDeletedEntity._id] || mostDeletedEntity._id,
            count: mostDeletedEntity.count,
          }
        : null,
      topDeleters: topDeleters.map((d) => ({ email: d._id, count: d.count })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  //  RESTORE — with conflict detection & dependency checking
  // ─────────────────────────────────────────────────────────────

  static async checkRestoreConflicts(id: string): Promise<RestoreResult> {
    const entry = await RecycleBin.findById(id);
    if (!entry || entry.status !== 'deleted') {
      return { success: false, conflicts: [] };
    }

    const modelName = ENTITY_MODEL_MAP[entry.entityType];
    if (!modelName || !mongoose.models[modelName]) {
      return { success: true };
    }

    const Model = mongoose.models[modelName];
    const uniqueFieldsForType = UNIQUE_FIELDS[entry.entityType] || [];
    const conflicts: RestoreConflict[] = [];

    // Check unique field conflicts
    for (const field of uniqueFieldsForType) {
      const value = entry.entityData?.[field];
      if (value) {
        const existing = await Model.findOne({ [field]: value }).lean();
        if (existing && existing._id.toString() !== entry.entityId.toString()) {
          conflicts.push({
            field,
            existingValue: value,
            conflictingDocumentId: existing._id.toString(),
          });
        }
      }
    }

    // Check dependency warnings (e.g., parent category deleted)
    const dependencyWarnings: RestoreResult['dependencyWarnings'] = [];

    if (entry.entityType === 'Product' && entry.entityData?.primaryCategory) {
      const Category = mongoose.models.Category;
      if (Category) {
        const cat = await Category.findById(entry.entityData.primaryCategory).lean();
        if (!cat) {
          // Check if category is also in recycle bin
          const deletedCat = await RecycleBin.findOne({
            entityType: 'Category',
            entityId: entry.entityData.primaryCategory,
            status: 'deleted',
          }).lean();

          dependencyWarnings.push({
            entityType: 'Category',
            entityId: entry.entityData.primaryCategory.toString(),
            entityName: deletedCat?.entityName || 'Unknown Category',
            recycleBinId: deletedCat?._id?.toString(),
            status: deletedCat ? 'deleted' : 'missing',
          });
        }
      }
    }

    if (entry.entityType === 'Review' && entry.entityData?.product) {
      const Product = mongoose.models.Product;
      if (Product) {
        const prod = await Product.findById(entry.entityData.product).lean();
        if (!prod) {
          const deletedProd = await RecycleBin.findOne({
            entityType: 'Product',
            entityId: entry.entityData.product,
            status: 'deleted',
          }).lean();

          dependencyWarnings.push({
            entityType: 'Product',
            entityId: entry.entityData.product.toString(),
            entityName: deletedProd?.entityName || 'Unknown Product',
            recycleBinId: deletedProd?._id?.toString(),
            status: deletedProd ? 'deleted' : 'missing',
          });
        }
      }
    }

    return {
      success: conflicts.length === 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      dependencyWarnings: dependencyWarnings.length > 0 ? dependencyWarnings : undefined,
    };
  }

  static async restore(
    id: string,
    actor?: any,
    options?: { autoRenameConflicts?: boolean; restoreDependencies?: boolean },
  ): Promise<RestoreResult> {
    const entry = await RecycleBin.findById(id);
    if (!entry || entry.status !== 'deleted') {
      return { success: false };
    }

    const modelName = ENTITY_MODEL_MAP[entry.entityType];
    let Model = mongoose.models[modelName];
    if (!Model && modelName) {
      try {
        Model = require(`../models/${modelName}`).default;
      } catch (err) {
        // ignore
      }
    }

    if (!Model) {
      return { success: false };
    }

    // ── Restore dependencies first if requested ──
    if (options?.restoreDependencies) {
      const conflictCheck = await this.checkRestoreConflicts(id);
      if (conflictCheck.dependencyWarnings) {
        for (const dep of conflictCheck.dependencyWarnings) {
          if (dep.status === 'deleted' && dep.recycleBinId) {
            await this.restore(dep.recycleBinId, actor);
          }
        }
      }
    }

    // ── Handle unique field conflicts ──
    const uniqueFieldsForType = UNIQUE_FIELDS[entry.entityType] || [];
    if (options?.autoRenameConflicts) {
      for (const field of uniqueFieldsForType) {
        const value = entry.entityData?.[field];
        if (value) {
          const existing = await Model.findOne({ [field]: value }).lean();
          if (existing && existing._id.toString() !== entry.entityId.toString()) {
            // Auto-rename: append timestamp
            const suffix = `-restored-${Date.now().toString().slice(-6)}`;
            entry.entityData[field] = value + suffix;
          }
        }
      }
    }

    // ── Perform the restore ──
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Restore the original document
      const doc = await Model.findOne({ _id: entry.entityId, isDeleted: true }).session(session);
      if (!doc) {
        // Document was hard-deleted; re-create it from snapshot
        const newDoc = new Model(entry.entityData);
        newDoc._id = entry.entityId;
        newDoc.isDeleted = false;
        newDoc.deletedAt = undefined;
        newDoc.deletedBy = undefined;
        newDoc.deletionReason = undefined;
        await newDoc.save({ session, validateBeforeSave: false });
      } else {
        doc.isDeleted = false;
        doc.deletedAt = undefined;
        doc.deletedBy = undefined;
        doc.deletionReason = undefined;

        // Apply any auto-renamed fields
        if (options?.autoRenameConflicts) {
          for (const field of uniqueFieldsForType) {
            if (entry.entityData[field]) {
              doc[field] = entry.entityData[field];
            }
          }
        }

        await doc.save({ session });
      }

      // Update RecycleBin entry
      const restoredBy = actor
        ? {
            userId: actor.id || actor._id?.toString(),
            email: actor.email,
            role: actor.role,
          }
        : undefined;

      entry.status = 'restored';
      entry.restoredAt = new Date();
      entry.restoredBy = restoredBy;
      entry.restoreCount = (entry.restoreCount || 0) + 1;
      entry.versionHistory.push({
        action: 'restored',
        performedBy: restoredBy,
        performedAt: new Date(),
      });
      await entry.save({ session });

      await session.commitTransaction();

      // Audit log
      await AdminAuditService.logAction({
        actorId: actor?.id || actor?._id?.toString(),
        actorEmail: actor?.email,
        actorRole: actor?.role,
        entityType: entry.entityType,
        entityId: entry.entityId.toString(),
        action: 'recycle_bin_restore',
        method: 'PATCH',
        newValue: { entityName: entry.entityName, entityType: entry.entityType },
      });

      await bumpPublicCacheVersion();

      return { success: true, restoredEntity: entry.entityData };
    } catch (err) {
      await session.abortTransaction();
      logger.error(`[RecycleBin] Restore failed for ${id}: ${(err as Error).message}`);
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  PERMANENT DELETE — with cleanup report
  // ─────────────────────────────────────────────────────────────

  static async permanentDelete(id: string, actor?: any): Promise<CleanupResult> {
    const entry = await RecycleBin.findById(id);
    if (!entry || entry.status === 'purged') {
      return { success: false, report: [], errors: ['Entry not found or already purged'] };
    }

    const report: ICleanupReportItem[] = [];
    const errors: string[] = [];

    // ── Step 1: Cloudinary cleanup ──
    if (entry.cloudinaryPublicIds && entry.cloudinaryPublicIds.length > 0) {
      try {
        const cloudinaryResult = await CloudinaryAdapter.deleteMultiple(entry.cloudinaryPublicIds);
        report.push({
          step: 'Cloudinary Assets Deleted',
          status: 'success',
          count: cloudinaryResult.succeeded.length,
          details:
            cloudinaryResult.failed.length > 0
              ? `${cloudinaryResult.failed.length} assets failed to delete`
              : undefined,
        });
        if (cloudinaryResult.failed.length > 0) {
          errors.push(`Cloudinary: ${cloudinaryResult.failed.length} assets failed`);
        }
      } catch (err: any) {
        report.push({
          step: 'Cloudinary Assets Deleted',
          status: 'failed',
          details: err.message,
        });
        errors.push(`Cloudinary cleanup failed: ${err.message}`);
      }
    } else {
      report.push({
        step: 'Cloudinary Assets Deleted',
        status: 'skipped',
        details: 'No Cloudinary assets to clean',
      });
    }

    // ── Step 2: MongoDB hard delete ──
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const modelName = ENTITY_MODEL_MAP[entry.entityType];
      let Model = mongoose.models[modelName];
      if (!Model && modelName) {
        try {
          Model = require(`../models/${modelName}`).default;
        } catch (err) {
          // ignore
        }
      }

      if (Model) {
        const deleteResult = await Model.deleteOne({ _id: entry.entityId }, { session });
        report.push({
          step: 'MongoDB Document Deleted',
          status: deleteResult.deletedCount > 0 ? 'success' : 'skipped',
          count: deleteResult.deletedCount,
          details: deleteResult.deletedCount === 0 ? 'Document was already removed' : undefined,
        });
      }

      // ── Step 3: Clean related entities (reviews, media, etc.) ──
      if (entry.entityType === 'Product') {
        // Delete associated reviews
        const Review = mongoose.models.Review;
        if (Review) {
          const reviewResult = await Review.deleteMany(
            { product: entry.entityId },
            { session, bypassDestructionGuard: true },
          );
          report.push({
            step: 'Reviews Deleted',
            status: 'success',
            count: reviewResult.deletedCount,
          });
        }

        // Clean user references (wishlist, cart, recentlyViewed)
        const User = mongoose.models.User;
        if (User) {
          const userResult = await User.updateMany(
            {
              $or: [
                { wishlist: entry.entityId },
                { 'cart.product': entry.entityId },
                { 'recentlyViewed.product': entry.entityId },
              ],
            },
            {
              $pull: {
                wishlist: entry.entityId,
                cart: { product: entry.entityId },
                recentlyViewed: { product: entry.entityId },
              },
            },
            { session },
          );
          report.push({
            step: 'User References Removed',
            status: 'success',
            count: userResult.modifiedCount,
          });
        }

        // Clean gallery
        const Gallery = mongoose.models.Gallery;
        if (Gallery) {
          const galleryResult = await Gallery.deleteMany(
            { linkedProducts: entry.entityId },
            { session, bypassDestructionGuard: true },
          );
          report.push({
            step: 'Gallery Items Deleted',
            status: 'success',
            count: galleryResult.deletedCount,
          });
        }

        // Clean coupon references
        const Coupon = mongoose.models.Coupon;
        if (Coupon) {
          await Coupon.updateMany(
            { targetProductIds: entry.entityId },
            { $pull: { targetProductIds: entry.entityId } },
            { session },
          );
          report.push({ step: 'Coupon References Removed', status: 'success' });
        }
      }

      // ── Step 4: Clean search index ──
      const SearchIndex = mongoose.models.SearchIndex;
      if (SearchIndex) {
        const searchResult = await SearchIndex.deleteMany(
          { entityId: entry.entityId },
          { session, bypassDestructionGuard: true },
        );
        report.push({
          step: 'Search Index Cleared',
          status: 'success',
          count: searchResult.deletedCount,
        });
      } else {
        report.push({ step: 'Search Index Cleared', status: 'skipped' });
      }

      // ── Step 5: Clean media entries ──
      const Media = mongoose.models.Media;
      if (Media) {
        const mediaResult = await Media.deleteMany(
          { 'references.documentId': entry.entityId },
          { session, bypassDestructionGuard: true },
        );
        report.push({
          step: 'Media References Deleted',
          status: 'success',
          count: mediaResult.deletedCount,
        });
      }

      // ── Step 6: Update RecycleBin entry ──
      const purgedBy = actor
        ? {
            userId: actor.id || actor._id?.toString(),
            email: actor.email,
            role: actor.role,
          }
        : { userId: 'system', email: 'system@auto-purge', role: 'system' };

      entry.status = 'purged';
      entry.purgedAt = new Date();
      entry.purgedBy = purgedBy;
      entry.cleanupReport = report;
      entry.versionHistory.push({
        action: 'purged',
        performedBy: purgedBy,
        performedAt: new Date(),
        reason: actor ? 'Manual permanent delete' : 'Auto-purge (retention expired)',
      });
      await entry.save({ session });

      await session.commitTransaction();

      report.push({ step: 'Cache Invalidated', status: 'success' });

      // Audit log
      await AdminAuditService.logAction({
        actorId: actor?.id || actor?._id?.toString() || 'system',
        actorEmail: actor?.email || 'system@auto-purge',
        actorRole: actor?.role || 'system',
        entityType: entry.entityType,
        entityId: entry.entityId.toString(),
        action: actor ? 'recycle_bin_permanent_delete' : 'recycle_bin_auto_purge',
        method: 'DELETE',
        previousValue: { entityName: entry.entityName, entityType: entry.entityType },
      });

      await bumpPublicCacheVersion();

      return { success: true, report, errors };
    } catch (err) {
      await session.abortTransaction();
      report.push({
        step: 'MongoDB Cleanup',
        status: 'failed',
        details: (err as Error).message,
      });
      errors.push(`MongoDB cleanup failed: ${(err as Error).message}`);
      logger.error(`[RecycleBin] Permanent delete failed for ${id}: ${(err as Error).message}`);
      return { success: false, report, errors };
    } finally {
      session.endSession();
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  BULK OPERATIONS
  // ─────────────────────────────────────────────────────────────

  static async bulkRestore(ids: string[], actor?: any) {
    const results = {
      success: 0,
      failed: 0,
      conflicts: [] as { id: string; entityName: string; conflicts: RestoreConflict[] }[],
      errors: [] as string[],
    };

    for (const id of ids) {
      try {
        const result = await this.restore(id, actor, { autoRenameConflicts: true });
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          if (result.conflicts) {
            const entry = await RecycleBin.findById(id).lean();
            results.conflicts.push({
              id,
              entityName: entry?.entityName || 'Unknown',
              conflicts: result.conflicts,
            });
          }
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${id}: ${err.message}`);
      }
    }

    // Audit log
    await AdminAuditService.logAction({
      actorId: actor?.id || actor?._id?.toString(),
      actorEmail: actor?.email,
      entityType: 'RecycleBin',
      entityId: 'bulk',
      action: 'recycle_bin_bulk_restore',
      newValue: { count: ids.length, success: results.success, failed: results.failed },
    });

    return results;
  }

  static async bulkPermanentDelete(ids: string[], actor?: any) {
    const results = {
      success: 0,
      failed: 0,
      totalCleanupReport: [] as { entityName: string; report: ICleanupReportItem[] }[],
      errors: [] as string[],
    };

    for (const id of ids) {
      try {
        const entry = await RecycleBin.findById(id).lean();
        const result = await this.permanentDelete(id, actor);
        if (result.success) {
          results.success++;
          results.totalCleanupReport.push({
            entityName: entry?.entityName || 'Unknown',
            report: result.report,
          });
        } else {
          results.failed++;
          results.errors.push(...result.errors);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${id}: ${err.message}`);
      }
    }

    // Audit log
    await AdminAuditService.logAction({
      actorId: actor?.id || actor?._id?.toString(),
      actorEmail: actor?.email,
      entityType: 'RecycleBin',
      entityId: 'bulk',
      action: 'recycle_bin_bulk_delete',
      newValue: { count: ids.length, success: results.success, failed: results.failed },
    });

    return results;
  }

  // ─────────────────────────────────────────────────────────────
  //  EMPTY RECYCLE BIN
  // ─────────────────────────────────────────────────────────────

  static async emptyBin(actor?: any) {
    const allDeleted = await RecycleBin.find({ status: 'deleted' }).select('_id').lean();
    const ids = allDeleted.map((item) => item._id.toString());

    const result = await this.bulkPermanentDelete(ids, actor);

    // Audit log
    await AdminAuditService.logAction({
      actorId: actor?.id || actor?._id?.toString(),
      actorEmail: actor?.email,
      entityType: 'RecycleBin',
      entityId: 'all',
      action: 'recycle_bin_empty',
      newValue: { totalItems: ids.length, ...result },
    });

    return result;
  }

  // ─────────────────────────────────────────────────────────────
  //  AUTO-PURGE (called by cron job)
  // ─────────────────────────────────────────────────────────────

  static async autoPurge(): Promise<{ purged: number; failed: number; errors: string[] }> {
    const now = new Date();
    const expiredItems = await RecycleBin.find({
      status: 'deleted',
      scheduledPurgeAt: { $lte: now },
    })
      .select('_id entityName entityType')
      .lean();

    if (expiredItems.length === 0) {
      return { purged: 0, failed: 0, errors: [] };
    }

    logger.info(`[RecycleBin Auto-Purge] Found ${expiredItems.length} expired items to purge`);

    let purged = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of expiredItems) {
      try {
        const result = await this.permanentDelete(item._id.toString());
        if (result.success) {
          purged++;
          logger.info(
            `[RecycleBin Auto-Purge] Purged ${item.entityType} "${item.entityName}" (${item._id})`,
          );
        } else {
          failed++;
          errors.push(`${item.entityName}: ${result.errors.join(', ')}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`${item.entityName}: ${err.message}`);
        logger.error(`[RecycleBin Auto-Purge] Failed to purge ${item._id}: ${err.message}`);
      }
    }

    logger.info(`[RecycleBin Auto-Purge] Complete. Purged: ${purged}, Failed: ${failed}`);

    return { purged, failed, errors };
  }

  // ─────────────────────────────────────────────────────────────
  //  SCHEDULED PURGE PREVIEW
  // ─────────────────────────────────────────────────────────────

  static async getScheduledPurgePreview() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfNextWeek = new Date(startOfToday.getTime() + 14 * 24 * 60 * 60 * 1000);

    const selectFields = 'entityName entityType entityThumbnail scheduledPurgeAt deletedAt';

    const [expiringToday, expiringTomorrow, expiringThisWeek, expiringNextWeek] = await Promise.all(
      [
        RecycleBin.find({
          status: 'deleted',
          scheduledPurgeAt: { $gte: startOfToday, $lt: startOfTomorrow },
        })
          .select(selectFields)
          .sort({ scheduledPurgeAt: 1 })
          .lean(),
        RecycleBin.find({
          status: 'deleted',
          scheduledPurgeAt: { $gte: startOfTomorrow, $lt: endOfTomorrow },
        })
          .select(selectFields)
          .sort({ scheduledPurgeAt: 1 })
          .lean(),
        RecycleBin.find({
          status: 'deleted',
          scheduledPurgeAt: { $gte: startOfToday, $lt: endOfWeek },
        })
          .select(selectFields)
          .sort({ scheduledPurgeAt: 1 })
          .lean(),
        RecycleBin.find({
          status: 'deleted',
          scheduledPurgeAt: { $gte: endOfWeek, $lt: endOfNextWeek },
        })
          .select(selectFields)
          .sort({ scheduledPurgeAt: 1 })
          .lean(),
      ],
    );

    return { expiringToday, expiringTomorrow, expiringThisWeek, expiringNextWeek };
  }

  // ─────────────────────────────────────────────────────────────
  //  EXPORT AUDIT LOGS
  // ─────────────────────────────────────────────────────────────

  static async getAuditLogs(params: {
    entityType?: string;
    action?: string;
    adminEmail?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = getPaginationOptions(params as any);

    const filter: any = {};

    if (params.entityType) {
      filter.entityType = params.entityType;
    }
    if (params.action) {
      filter['versionHistory.action'] = params.action;
    }
    if (params.adminEmail) {
      filter.$or = [
        { 'deletedBy.email': params.adminEmail },
        { 'restoredBy.email': params.adminEmail },
        { 'purgedBy.email': params.adminEmail },
      ];
    }
    if (params.startDate || params.endDate) {
      filter.updatedAt = {};
      if (params.startDate) filter.updatedAt.$gte = new Date(params.startDate);
      if (params.endDate) filter.updatedAt.$lte = new Date(params.endDate);
    }

    const [logs, totalCount] = await Promise.all([
      RecycleBin.find(filter)
        .select(
          'entityType entityId entityName status deletedBy deletedAt restoredBy restoredAt purgedBy purgedAt versionHistory deleteCount restoreCount',
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RecycleBin.countDocuments(filter),
    ]);

    return formatPaginationResponse(logs, totalCount, page, limit);
  }

  /**
   * Formats audit logs for CSV/Excel export
   */
  static async exportAuditLogs(params: {
    entityType?: string;
    action?: string;
    adminEmail?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    const filter: any = {};
    if (params.entityType) filter.entityType = params.entityType;
    if (params.adminEmail) {
      filter.$or = [
        { 'deletedBy.email': params.adminEmail },
        { 'restoredBy.email': params.adminEmail },
        { 'purgedBy.email': params.adminEmail },
      ];
    }
    if (params.startDate || params.endDate) {
      filter.updatedAt = {};
      if (params.startDate) filter.updatedAt.$gte = new Date(params.startDate);
      if (params.endDate) filter.updatedAt.$lte = new Date(params.endDate);
    }

    const logs = await RecycleBin.find(filter)
      .select(
        'entityType entityId entityName status deletedBy deletedAt restoredBy restoredAt purgedBy purgedAt versionHistory',
      )
      .sort({ updatedAt: -1 })
      .limit(5000) // Cap export at 5000 rows
      .lean();

    // Flatten for export
    return logs.flatMap((log) =>
      log.versionHistory.map((historyEntry) => ({
        'Entity Type': ENTITY_DISPLAY_NAMES[log.entityType] || log.entityType,
        'Entity Name': log.entityName,
        'Entity ID': log.entityId?.toString(),
        Action: historyEntry.action,
        'Performed By': historyEntry.performedBy?.email || 'System',
        'Performed At': historyEntry.performedAt
          ? new Date(historyEntry.performedAt).toISOString()
          : '',
        Reason: historyEntry.reason || '',
        'Current Status': log.status,
      })),
    );
  }
}
