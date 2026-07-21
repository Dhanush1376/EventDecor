import mongoose, { Schema, Document } from 'mongoose';
import logger from '../config/logger';
import { ReferenceIntegrityService } from '../services/ReferenceIntegrityService';

export interface ISoftDeleted extends Document {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  deletionReason?: string;
  softDelete: (actor?: any, reason?: string) => Promise<this>;
  restore: (actor?: any) => Promise<this>;
}

export interface SoftDeleteModel<T extends Document> extends mongoose.Model<T> {
  findDeleted: () => mongoose.Query<T[], T>;
  findWithDeleted: () => mongoose.Query<T[], T>;
}

// -------------------------------------------------------------------
// Protected system resources — block accidental deletion of critical data
// -------------------------------------------------------------------
const PROTECTED_RESOURCES: Record<string, (doc: any) => boolean> = {
  Category: (doc) => doc.slug === 'uncategorized' || doc.slug === 'default',
  StoreSettings: () => true,
};

/**
 * Extracts a human-readable name from a document.
 */
const extractEntityName = (doc: any): string => {
  return (
    doc.title ||
    doc.name ||
    doc.code ||
    doc.slug ||
    doc.customerName ||
    doc.subject ||
    doc.label ||
    doc._id?.toString() ||
    'Unnamed'
  );
};

/**
 * Extracts a thumbnail URL from a document.
 */
const extractThumbnail = (doc: any): string | null => {
  return doc.imageSrc || doc.image || doc.heroImage || doc.thumbnail || null;
};

/**
 * Extracts all Cloudinary public IDs from a document for future cleanup.
 */
const extractCloudinaryPublicIds = (doc: any): string[] => {
  const publicIds: string[] = [];

  // From structured media fields (reviewImages, etc.)
  const mediaArrayFields = ['reviewImages'];
  for (const field of mediaArrayFields) {
    if (Array.isArray(doc[field])) {
      for (const item of doc[field]) {
        if (item?.publicId) publicIds.push(item.publicId);
      }
    }
  }

  // From image URL fields — extract Cloudinary public_id from URL patterns
  const imageFields = ['imageSrc', 'image', 'heroImage', 'thumbnail'];
  for (const field of imageFields) {
    if (doc[field] && typeof doc[field] === 'string') {
      const cloudinaryId = extractPublicIdFromUrl(doc[field]);
      if (cloudinaryId) publicIds.push(cloudinaryId);
    }
  }

  // From image arrays
  const imageArrayFields = ['images', 'gallery'];
  for (const field of imageArrayFields) {
    if (Array.isArray(doc[field])) {
      for (const url of doc[field]) {
        if (typeof url === 'string') {
          const cloudinaryId = extractPublicIdFromUrl(url);
          if (cloudinaryId) publicIds.push(cloudinaryId);
        }
      }
    }
  }

  return [...new Set(publicIds)];
};

/**
 * Attempts to extract a Cloudinary public_id from a URL.
 * Handles patterns like: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/filename.ext
 */
const extractPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes('cloudinary')) return null;
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const SoftDeletePlugin = (schema: Schema, options?: { retentionDays?: number }) => {
  const retentionDays = options?.retentionDays || 30;

  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.Mixed, default: null },
    deletionReason: { type: String, default: null },
  });

  // Pre-find hooks to exclude soft-deleted docs
  const excludeDeleted = function (this: any) {
    const filter = this.getFilter();
    // Only exclude if isDeleted is not explicitly queried
    if (filter.isDeleted === undefined) {
      this.where({ isDeleted: { $ne: true } });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);

  // Instance methods
  schema.methods.softDelete = async function (actor?: any, reason?: string) {
    const modelName = (this.constructor as any).modelName;

    // ── Protected Resource Check ──
    const protectionCheck = PROTECTED_RESOURCES[modelName];
    if (protectionCheck && protectionCheck(this)) {
      throw new Error(
        `Cannot delete protected system resource: ${modelName} "${extractEntityName(this)}". This resource is required for the system to function correctly.`,
      );
    }

    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = actor
      ? {
          userId: actor.id || actor._id?.toString(),
          email: actor.email,
          role: actor.role,
        }
      : undefined;
    this.deletionReason = reason;
    await this.save();

    try {
      // Dynamically load the RecycleBin model to avoid initialization order/circular dependency issues
      const RecycleBin = mongoose.models.RecycleBin || require('../models/RecycleBin').default;
      const scheduledPurgeAt = new Date(
        this.deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000,
      );

      const docObj = this.toObject();
      const entityName = extractEntityName(docObj);
      const entityThumbnail = extractThumbnail(docObj);
      const cloudinaryPublicIds = extractCloudinaryPublicIds(docObj);
      const collectionName = (this.constructor as any).collection.name;

      // Check if item was previously deleted & restored (version history tracking)
      const existingEntry = await RecycleBin.findOne({
        entityType: modelName,
        entityId: this._id,
        status: 'restored',
      }).sort({ updatedAt: -1 });

      const deleteCount = existingEntry ? (existingEntry.deleteCount || 1) + 1 : 1;
      const previousHistory = existingEntry?.versionHistory || [];

      await RecycleBin.create({
        entityType: modelName,
        entityId: this._id,
        entityName,
        entityThumbnail,
        entityData: docObj,
        originalCollection: collectionName,
        deletedBy: this.deletedBy,
        deleteReason: reason || null,
        deletedAt: this.deletedAt,
        scheduledPurgeAt,
        status: 'deleted',
        cloudinaryPublicIds,
        deleteCount,
        restoreCount: existingEntry?.restoreCount || 0,
        versionHistory: [
          ...previousHistory,
          {
            action: 'deleted',
            performedBy: this.deletedBy,
            performedAt: this.deletedAt,
            reason: reason || undefined,
          },
        ],
      });
    } catch (err: any) {
      logger.error(
        `[SoftDelete] Failed to create RecycleBin entry for ${this._id}: ${err.message}`,
      );
    }

    // Trigger cascading updates for reference integrity
    try {
      await ReferenceIntegrityService.onSoftDelete(modelName, this._id.toString(), this.toObject());
    } catch (err: any) {
      logger.error(`[SoftDelete] Cascade failure for ${this._id}: ${err.message}`);
    }

    return this;
  };

  schema.methods.restore = async function (actor?: any) {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.deletionReason = undefined;
    await this.save();

    try {
      // Update RecycleBin entry
      const RecycleBin = mongoose.models.RecycleBin || require('../models/RecycleBin').default;
      const restoredBy = actor
        ? {
            userId: actor.id || actor._id?.toString(),
            email: actor.email,
            role: actor.role,
          }
        : undefined;

      await RecycleBin.findOneAndUpdate(
        { entityType: (this.constructor as any).modelName, entityId: this._id, status: 'deleted' },
        {
          status: 'restored',
          restoredAt: new Date(),
          restoredBy,
          $inc: { restoreCount: 1 },
          $push: {
            versionHistory: {
              action: 'restored',
              performedBy: restoredBy,
              performedAt: new Date(),
            },
          },
        },
      );
    } catch (err: any) {
      logger.error(
        `[SoftDelete] Failed to update RecycleBin entry for ${this._id} on restore: ${err.message}`,
      );
    }

    return this;
  };

  // Static methods
  schema.statics.findDeleted = function () {
    return this.find({ isDeleted: true });
  };

  // Create an explicit bypass for findWithDeleted
  schema.statics.findWithDeleted = function (conditions: any = {}) {
    // By explicitly querying isDeleted with $exists, we bypass the hook
    return this.find({ ...conditions, isDeleted: { $exists: true } });
  };

  // Handle aggregate to exclude deleted by default
  schema.pre('aggregate', function (this: any) {
    const pipeline = this.pipeline();
    // If there is no $match stage for isDeleted, add one
    const hasIsDeletedMatch = pipeline.some(
      (stage: any) => stage.$match && stage.$match.isDeleted !== undefined,
    );
    if (!hasIsDeletedMatch) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });
};

export default SoftDeletePlugin;
