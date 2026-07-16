import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppConfigSnapshot extends Document {
  snapshotId: string;
  name: string;
  description: string;
  createdBy?: mongoose.Types.ObjectId;
  configData: any; // Massive JSON of all state
  createdAt: Date;
}

const WhatsAppConfigSnapshotSchema = new Schema<IWhatsAppConfigSnapshot>(
  {
    snapshotId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    configData: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

WhatsAppConfigSnapshotSchema.index({ createdAt: -1 });

// Immutability Hook: Prevent modifications to snapshots
WhatsAppConfigSnapshotSchema.pre(/update|delete|remove/i, function (this: any, next: any) {
  const err = new Error(
    'WhatsAppConfigSnapshot is an append-only immutable collection. Modifications or deletions are strictly prohibited.',
  );
  next(err);
});

export default mongoose.models.WhatsAppConfigSnapshot ||
  mongoose.model<IWhatsAppConfigSnapshot>('WhatsAppConfigSnapshot', WhatsAppConfigSnapshotSchema);
