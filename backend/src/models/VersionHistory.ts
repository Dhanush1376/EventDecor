import mongoose, { Schema, Document } from 'mongoose';

export interface IVersionHistory extends Document {
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  version: number;
  data: any;
  changes?: any;
  changedBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  changeType: 'create' | 'update' | 'soft_delete' | 'restore' | 'bulk_update';
  createdAt: Date;
}

const VersionHistorySchema: Schema = new Schema({
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.Mixed, required: true },
  version: { type: Number, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  changes: { type: Schema.Types.Mixed },
  changedBy: { type: Schema.Types.Mixed },
  changeType: {
    type: String,
    enum: ['create', 'update', 'soft_delete', 'restore', 'bulk_update'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Compound indexes for fast retrieval of entity history
VersionHistorySchema.index({ entityType: 1, entityId: 1, version: 1 }, { unique: true });
VersionHistorySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const VersionHistory = mongoose.model<IVersionHistory>('VersionHistory', VersionHistorySchema);
export default VersionHistory;
