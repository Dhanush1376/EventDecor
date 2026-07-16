import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppPriorityConfig extends Document {
  highValueOrderThreshold: number;
  vipSpendThreshold: number;
  expressDeliveryThreshold: number; // maybe hours remaining
  lowInventoryThreshold: number;

  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppPriorityConfigSchema = new Schema(
  {
    highValueOrderThreshold: { type: Number, default: 20000 },
    vipSpendThreshold: { type: Number, default: 50000 },
    expressDeliveryThreshold: { type: Number, default: 24 },
    lowInventoryThreshold: { type: Number, default: 10 },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const WhatsAppPriorityConfig = mongoose.model<IWhatsAppPriorityConfig>(
  'WhatsAppPriorityConfig',
  WhatsAppPriorityConfigSchema,
);

export default WhatsAppPriorityConfig;
