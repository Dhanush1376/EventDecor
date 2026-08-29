import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceability extends Document {
  locationCode: string;
  locationName: string;
  type: 'state' | 'union_territory';
  enabled: boolean;
  baseTravelFee: number;
  freeTravelDistanceKm: number;
  perKmRate: number;
  stateSurcharge: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceabilitySchema: Schema = new Schema(
  {
    locationCode: { type: String, required: true, unique: true },
    locationName: { type: String, required: true },
    type: { type: String, enum: ['state', 'union_territory'], required: true },
    enabled: { type: Boolean, default: false },
    baseTravelFee: { type: Number, default: 0, min: 0 },
    freeTravelDistanceKm: { type: Number, default: 0, min: 0 },
    perKmRate: { type: Number, default: 0, min: 0 },
    stateSurcharge: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ServiceabilitySchema.index({ enabled: 1 });

const Serviceability = mongoose.model<IServiceability>('Serviceability', ServiceabilitySchema);

export default Serviceability;
