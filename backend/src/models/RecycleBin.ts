import mongoose, { Schema, Document } from 'mongoose';

export interface IRecycleBin extends Document {
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  entityData: any;
  deletedBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  deletedAt: Date;
  scheduledPurgeAt: Date;
  restoredAt?: Date;
  restoredBy?: {
    userId: string;
    email?: string;
    role?: string;
  };
  status: 'deleted' | 'restored' | 'purged';
}

const RecycleBinSchema: Schema = new Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.Mixed, required: true, index: true }, // Mixed because it could be ObjectId or String
    entityData: { type: Schema.Types.Mixed, required: true },
    deletedBy: { type: Schema.Types.Mixed },
    deletedAt: { type: Date, required: true, default: Date.now },
    scheduledPurgeAt: { type: Date, required: true },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['deleted', 'restored', 'purged'],
      default: 'deleted',
      index: true,
    },
  },
  { timestamps: true },
);

// Index to quickly find items pending purge
RecycleBinSchema.index({ status: 1, scheduledPurgeAt: 1 });

const RecycleBin = mongoose.model<IRecycleBin>('RecycleBin', RecycleBinSchema);
export default RecycleBin;
