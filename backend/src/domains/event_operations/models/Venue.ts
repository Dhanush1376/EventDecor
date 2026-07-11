import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IVenue extends IBaseEntity {
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  googleMapsLink?: string;
  contactPerson: {
    name: string;
    phone: string;
    email?: string;
    role: string; // e.g. 'Manager', 'Owner'
  };
  logistics: {
    hasLoadingDock: boolean;
    freightElevatorAvailable: boolean;
    setupTimeRestrictions?: string; // e.g. "Only after 10 PM"
    vehicleHeightClearance?: number; // meters
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    googleMapsLink: { type: String },
    contactPerson: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      role: { type: String, default: 'Manager' },
    },
    logistics: {
      hasLoadingDock: { type: Boolean, default: false },
      freightElevatorAvailable: { type: Boolean, default: false },
      setupTimeRestrictions: { type: String },
      vehicleHeightClearance: { type: Number },
    },
    notes: { type: String },
  },
  { timestamps: true },
);

VenueSchema.plugin(SoftDeletePlugin);
VenueSchema.plugin(ForensicAuditPlugin);
VenueSchema.plugin(BaseEntityPlugin);

const Venue = mongoose.model<IVenue, SoftDeleteModel<IVenue>>('Venue', VenueSchema);

export default Venue;
