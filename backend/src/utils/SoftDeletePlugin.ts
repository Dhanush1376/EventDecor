import mongoose, { Schema, Document } from 'mongoose';
import logger from '../config/logger';

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
      await RecycleBin.create({
        entityType: (this.constructor as any).modelName,
        entityId: this._id,
        entityData: this.toObject(),
        deletedBy: this.deletedBy,
        deletedAt: this.deletedAt,
        scheduledPurgeAt,
        status: 'deleted',
      });
    } catch (err: any) {
      logger.error(
        `[SoftDelete] Failed to create RecycleBin entry for ${this._id}: ${err.message}`,
      );
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
      await RecycleBin.findOneAndUpdate(
        { entityType: (this.constructor as any).modelName, entityId: this._id, status: 'deleted' },
        {
          status: 'restored',
          restoredAt: new Date(),
          restoredBy: actor
            ? {
                userId: actor.id || actor._id?.toString(),
                email: actor.email,
                role: actor.role,
              }
            : undefined,
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
