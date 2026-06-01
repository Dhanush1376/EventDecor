import mongoose, { Schema, Document } from 'mongoose';

/**
 * RentalInspection — Post-return inspection log.
 *
 * Created when admin processes a returned rental item. Records
 * condition assessment, penalty calculations, and deposit adjustments.
 */

export interface IRentalInspection extends Document {
  rentalOrder: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  condition: 'excellent' | 'good' | 'minor_damage' | 'major_damage' | 'lost';
  refundAmount: number;
  penaltyAmount: number;
  depositDeduction: number;
  inspectedBy: string;
  notes?: string;
  images: string[];
  createdAt: Date;
}

const RentalInspectionSchema: Schema = new Schema(
  {
    rentalOrder: { type: Schema.Types.ObjectId, ref: 'RentalOrder', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'minor_damage', 'major_damage', 'lost'],
      required: true,
    },
    refundAmount: { type: Number, default: 0, min: 0 },
    penaltyAmount: { type: Number, default: 0, min: 0 },
    depositDeduction: { type: Number, default: 0, min: 0 },
    inspectedBy: { type: String, required: true },
    notes: { type: String },
    images: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

RentalInspectionSchema.index({ rentalOrder: 1, createdAt: -1 });
RentalInspectionSchema.index({ product: 1, createdAt: -1 });
RentalInspectionSchema.index({ condition: 1, createdAt: -1 });

const RentalInspection = mongoose.model<IRentalInspection>(
  'RentalInspection',
  RentalInspectionSchema,
);
export default RentalInspection;
