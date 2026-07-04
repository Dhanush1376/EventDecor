import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IRentalItemLifecycle } from '../types/rentalItemLifecycle';

const RentalItemLifecycleSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, index: true },
    usageCount: { type: Number, default: 0 },
    maxUsageCycles: { type: Number, default: 50 },
    cleaningHistory: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['standard', 'deep'], default: 'standard' },
        performedBy: { type: String },
        notes: { type: String },
      },
    ],
    repairHistory: [
      {
        date: { type: Date, default: Date.now },
        issue: { type: String, required: true },
        resolution: { type: String, required: true },
        cost: { type: Number, default: 0 },
        performedBy: { type: String },
      },
    ],
    damageHistory: [
      {
        date: { type: Date, default: Date.now },
        description: { type: String, required: true },
        severity: { type: String, enum: ['minor', 'moderate', 'severe'], required: true },
        photos: [{ type: String }],
        rentalOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
      },
    ],
    currentCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'retired'],
      default: 'excellent',
    },
    retirementDate: { type: Date },
    retirementReason: { type: String },
    isRetired: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  },
);

RentalItemLifecycleSchema.plugin(SoftDeletePlugin);
RentalItemLifecycleSchema.plugin(ForensicAuditPlugin);

const RentalItemLifecycle = mongoose.model<
  IRentalItemLifecycle,
  SoftDeleteModel<IRentalItemLifecycle>
>('RentalItemLifecycle', RentalItemLifecycleSchema);

export default RentalItemLifecycle;
