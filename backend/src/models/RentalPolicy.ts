import mongoose, { Schema, Document } from 'mongoose';

/**
 * RentalPolicy — Singleton configuration for rental business rules.
 *
 * Only one active policy document exists at a time. The admin can update
 * it but cannot create multiples.
 */

export interface IDamagePolicy {
  minor: number;
  major: number;
  complete: number;
}

export interface ILostProductPolicy {
  type: 'full_cost' | 'percentage';
  percentage: number;
}

export interface ICancellationPolicy {
  freeCancelHours: number;
  postConfirmChargePercent: number;
}

export interface IRentalPolicy extends Document {
  lateReturnFeePerDay: number;
  damagePolicy: IDamagePolicy;
  lostProductPolicy: ILostProductPolicy;
  cancellationPolicy: ICancellationPolicy;
  returnConditions: string[];
  requiredDocuments: string[];
  identityVerificationRequired: boolean;
  termsAndConditions: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RentalPolicySchema: Schema = new Schema(
  {
    lateReturnFeePerDay: { type: Number, default: 100, min: 0 },
    damagePolicy: {
      minor: { type: Number, default: 200 },
      major: { type: Number, default: 1000 },
      complete: { type: Number, default: 0 }, // 0 = full product cost
    },
    lostProductPolicy: {
      type: {
        type: String,
        enum: ['full_cost', 'percentage'],
        default: 'full_cost',
      },
      percentage: { type: Number, default: 100, min: 0, max: 200 },
    },
    cancellationPolicy: {
      freeCancelHours: { type: Number, default: 24 },
      postConfirmChargePercent: { type: Number, default: 50, min: 0, max: 100 },
    },
    returnConditions: [{ type: String }],
    requiredDocuments: [
      {
        type: String,
        enum: ['aadhaar', 'pan', 'driving_license', 'voter_id'],
      },
    ],
    identityVerificationRequired: { type: Boolean, default: false },
    termsAndConditions: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

RentalPolicySchema.index({ isActive: 1 });

const RentalPolicy = mongoose.model<IRentalPolicy>('RentalPolicy', RentalPolicySchema);
export default RentalPolicy;
