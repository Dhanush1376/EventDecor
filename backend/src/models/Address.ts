import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  pincode: string;
  locality: string;
  addressString: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  tag: string;
  isDefault: boolean;
  deliveryInstructions?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: { type: String },
    email: { type: String, required: true },
    pincode: { type: String, required: true },
    locality: { type: String, required: true },
    addressString: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    tag: { type: String, default: 'Home' },
    isDefault: { type: Boolean, default: false },
    deliveryInstructions: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

AddressSchema.index({ user: 1 });
AddressSchema.index({ user: 1, isDefault: 1 });

const Address = mongoose.model<IAddress>('Address', AddressSchema);
export default Address;
