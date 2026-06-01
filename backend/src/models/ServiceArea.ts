import mongoose, { Schema, Document } from 'mongoose';

/**
 * ServiceArea — Delivery/rental service radius configuration.
 *
 * Each document defines a circular service area with a center point
 * and radius. Used to validate whether a customer's address is within
 * the rentable delivery zone. The Haversine formula is used for
 * distance calculations at the service layer.
 */

export interface IServiceArea extends Document {
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceAreaSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    radiusKm: { type: Number, required: true, min: 1, max: 500 },
    address: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ServiceAreaSchema.index({ isActive: 1 });
ServiceAreaSchema.index({ 'center.lat': 1, 'center.lng': 1 });

const ServiceArea = mongoose.model<IServiceArea>('ServiceArea', ServiceAreaSchema);
export default ServiceArea;
