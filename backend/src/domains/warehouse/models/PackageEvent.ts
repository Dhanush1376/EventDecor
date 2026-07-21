import mongoose, { Schema, Model } from 'mongoose';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';

export interface IPackageEvent extends mongoose.Document {
  packageId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  status:
    | 'created'
    | 'items_verified'
    | 'packed'
    | 'sealed'
    | 'labeled'
    | 'ready_for_pickup'
    | 'shipped'
    | 'dispatched';
  timestamp: Date;
  performedBy?: {
    userId: mongoose.Types.ObjectId;
    name: string;
    role?: string;
  };
  notes?: string;
  scanId?: string; // If triggered by a scanner
  metadata?: any;
}

const PackageEventSchema = new Schema(
  {
    packageId: { type: Schema.Types.ObjectId, ref: 'Package', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    status: {
      type: String,
      enum: [
        'created',
        'items_verified',
        'packed',
        'sealed',
        'labeled',
        'ready_for_pickup',
        'shipped',
        'dispatched',
      ],
      required: true,
      index: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },
    performedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      role: { type: String },
    },
    notes: { type: String },
    scanId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

PackageEventSchema.index({ packageId: 1, timestamp: -1 });

// Immutable event log
PackageEventSchema.plugin(ForensicAuditPlugin);

const PackageEvent = mongoose.model<IPackageEvent, Model<IPackageEvent>>(
  'PackageEvent',
  PackageEventSchema,
);

export default PackageEvent;
