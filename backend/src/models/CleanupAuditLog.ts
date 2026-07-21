import mongoose, { Schema, Document } from 'mongoose';

export interface ICleanupAuditLog extends Document {
  deduplicationKey: string;
  entityType: string;
  entityId: string;
  operation: 'update' | 'delete' | 'purge' | 'integrity_sweep' | 'orphan_cleanup';

  deletedAssets: Array<{
    url: string;
    publicId?: string;
    provider: string;
    resourceType?: string;
    bytesReclaimed?: number;
  }>;
  deletedReferences: Array<{
    targetModel: string;
    targetField: string;
    targetDocId: string;
    action: string;
  }>;
  failedAssets: Array<{
    url: string;
    publicId?: string;
    error: string;
    willRetry: boolean;
  }>;
  skippedAssets: Array<{
    url: string;
    reason: string;
  }>;

  assetsDeleted: number;
  assetsFailed: number;
  assetsSkipped: number;
  referencesUpdated: number;
  bytesReclaimed: number;
  executionMs: number;

  initiatedBy?: {
    type: 'admin' | 'system' | 'cron' | 'plugin';
    userId?: string;
    email?: string;
  };

  status: 'completed' | 'partial' | 'failed' | 'skipped_idempotent' | 'dry_run';
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const CleanupAuditLogSchema = new Schema<ICleanupAuditLog>(
  {
    deduplicationKey: { type: String, required: true, unique: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    operation: {
      type: String,
      enum: ['update', 'delete', 'purge', 'integrity_sweep', 'orphan_cleanup'],
      required: true,
    },

    deletedAssets: [
      {
        url: String,
        publicId: String,
        provider: String,
        resourceType: String,
        bytesReclaimed: Number,
      },
    ],
    deletedReferences: [
      {
        targetModel: String,
        targetField: String,
        targetDocId: String,
        action: String,
      },
    ],
    failedAssets: [
      {
        url: String,
        publicId: String,
        error: String,
        willRetry: Boolean,
      },
    ],
    skippedAssets: [
      {
        url: String,
        reason: String,
      },
    ],

    assetsDeleted: { type: Number, default: 0 },
    assetsFailed: { type: Number, default: 0 },
    assetsSkipped: { type: Number, default: 0 },
    referencesUpdated: { type: Number, default: 0 },
    bytesReclaimed: { type: Number, default: 0 },
    executionMs: { type: Number, default: 0 },

    initiatedBy: {
      type: { type: String, enum: ['admin', 'system', 'cron', 'plugin'] },
      userId: String,
      email: String,
    },

    status: {
      type: String,
      enum: ['completed', 'partial', 'failed', 'skipped_idempotent', 'dry_run'],
      default: 'completed',
    },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Auto-purge logs older than retention days (e.g., 90 days default)
// The expireAfterSeconds is set high initially, we can adjust via TTL index manually if needed,
// but hardcoding to 90 days (7776000 seconds) for simplicity, or
// we will rely on a cron to clean it up if we want dynamic retention.
// For now, setting a fixed 90-day TTL index.
CleanupAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const CleanupAuditLog = mongoose.model<ICleanupAuditLog>('CleanupAuditLog', CleanupAuditLogSchema);

export default CleanupAuditLog;
