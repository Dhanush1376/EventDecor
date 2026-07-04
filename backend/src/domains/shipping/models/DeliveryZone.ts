import mongoose, { Schema, Document } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';

export interface IDeliveryZone extends Document {
  pincodeStart: string;
  pincodeEnd: string;
  zoneName: string;
  transitDays: number;
  isServiceable: boolean;
  courierPartners: string[];
  surcharge: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryZoneSchema = new Schema(
  {
    pincodeStart: { type: String, required: true, index: true },
    pincodeEnd: { type: String, required: true, index: true },
    zoneName: { type: String, required: true },
    transitDays: { type: Number, required: true, min: 1 },
    isServiceable: { type: Boolean, default: true, index: true },
    courierPartners: [{ type: String }],
    surcharge: { type: Number, default: 0 },
  },
  { timestamps: true },
);

DeliveryZoneSchema.index({ pincodeStart: 1, pincodeEnd: 1 });

DeliveryZoneSchema.plugin(SoftDeletePlugin);
DeliveryZoneSchema.plugin(ForensicAuditPlugin);

const DeliveryZone = mongoose.model<IDeliveryZone, SoftDeleteModel<IDeliveryZone>>(
  'DeliveryZone',
  DeliveryZoneSchema,
);

export default DeliveryZone;
