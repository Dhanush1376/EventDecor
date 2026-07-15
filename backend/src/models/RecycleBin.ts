import mongoose, { Schema, Document } from 'mongoose';

export interface IRecycleBinHistoryEntry {
  action: 'deleted' | 'restored' | 'purged';
  performedBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  performedAt: Date;
  reason?: string;
  ip?: string;
}

export interface IRelatedEntity {
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  entityName?: string;
  recycleBinId?: mongoose.Types.ObjectId;
}

export interface ICleanupReportItem {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  details?: string;
  count?: number;
}

export interface IRecycleBin extends Document {
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  entityName: string;
  entityThumbnail?: string;
  entityData: any;
  originalCollection: string;
  deletedBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  deleteReason?: string;
  deletedAt: Date;
  scheduledPurgeAt: Date;
  restoredAt?: Date;
  restoredBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  purgedAt?: Date;
  purgedBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  status: 'deleted' | 'restored' | 'purged';
  cloudinaryPublicIds: string[];
  relatedEntities: IRelatedEntity[];
  versionHistory: IRecycleBinHistoryEntry[];
  cleanupReport: ICleanupReportItem[];
  isProtected: boolean;
  deleteCount: number;
  restoreCount: number;
}

const RecycleBinSchema: Schema = new Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.Mixed, required: true, index: true },
    entityName: { type: String, required: true, default: 'Unnamed' },
    entityThumbnail: { type: String, default: null },
    entityData: { type: Schema.Types.Mixed, required: true },
    originalCollection: { type: String, required: false, default: 'unknown' },
    deletedBy: { type: Schema.Types.Mixed },
    deleteReason: { type: String, default: null },
    deletedAt: { type: Date, required: true, default: Date.now },
    scheduledPurgeAt: { type: Date, required: true },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.Mixed },
    purgedAt: { type: Date },
    purgedBy: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['deleted', 'restored', 'purged'],
      default: 'deleted',
      index: true,
    },
    cloudinaryPublicIds: [{ type: String }],
    relatedEntities: [
      {
        entityType: { type: String },
        entityId: { type: Schema.Types.Mixed },
        entityName: { type: String },
        recycleBinId: { type: Schema.Types.ObjectId, ref: 'RecycleBin' },
      },
    ],
    versionHistory: [
      {
        action: { type: String, enum: ['deleted', 'restored', 'purged'], required: true },
        performedBy: { type: Schema.Types.Mixed },
        performedAt: { type: Date, default: Date.now },
        reason: { type: String },
        ip: { type: String },
      },
    ],
    cleanupReport: [
      {
        step: { type: String },
        status: { type: String, enum: ['success', 'failed', 'skipped'] },
        details: { type: String },
        count: { type: Number },
      },
    ],
    isProtected: { type: Boolean, default: false },
    deleteCount: { type: Number, default: 1 },
    restoreCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Compound indexes for efficient querying
RecycleBinSchema.index({ status: 1, scheduledPurgeAt: 1 });
RecycleBinSchema.index({ status: 1, entityType: 1, deletedAt: -1 });
RecycleBinSchema.index({ status: 1, deletedAt: -1 });
RecycleBinSchema.index({ status: 1, scheduledPurgeAt: 1, entityType: 1 });
RecycleBinSchema.index({ entityName: 'text' }, { name: 'RecycleBinTextSearch' });
RecycleBinSchema.index({ 'deletedBy.userId': 1, status: 1 });
RecycleBinSchema.index({ entityType: 1, entityId: 1 });

const RecycleBin = mongoose.model<IRecycleBin>('RecycleBin', RecycleBinSchema);
export default RecycleBin;
