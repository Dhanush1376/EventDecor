import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface ICourier extends IBaseEntity {
  name: string;
  code: string;
  providerType: 'shiprocket' | 'manual' | 'custom';
  isActive: boolean;
  priority: number;
  apiCredentials?: {
    apiKey?: string;
    apiSecret?: string;
    endpoint?: string;
  };
  supportedZones: string[]; // Array of DeliveryZone IDs
  capabilities: {
    maxWeight?: number;
    expressDelivery: boolean;
    cashOnDelivery: boolean;
    pickupScheduling: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CourierSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, // e.g. 'DELHIVERY', 'BLUEDART'
    providerType: {
      type: String,
      enum: ['shiprocket', 'manual', 'custom'],
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 1, index: true }, // 1 is highest priority
    apiCredentials: {
      apiKey: { type: String },
      apiSecret: { type: String },
      endpoint: { type: String },
    },
    supportedZones: [{ type: Schema.Types.ObjectId, ref: 'DeliveryZone' }],
    capabilities: {
      maxWeight: { type: Number },
      expressDelivery: { type: Boolean, default: false },
      cashOnDelivery: { type: Boolean, default: false },
      pickupScheduling: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

CourierSchema.plugin(SoftDeletePlugin);
CourierSchema.plugin(ForensicAuditPlugin);
CourierSchema.plugin(BaseEntityPlugin);

const Courier = mongoose.model<ICourier, SoftDeleteModel<ICourier>>('Courier', CourierSchema);

export default Courier;
