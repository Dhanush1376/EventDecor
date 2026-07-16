import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppCostConfig extends Document {
  provider: string; // e.g., 'meta_cloud', 'twilio'
  countryCode: string; // e.g., 'IN', 'US', 'GB'
  messageType: string; // e.g., 'utility', 'marketing', 'authentication', 'session'
  costPerMessage: number;
  currency: string;
  effectiveFrom: Date;
}

const WhatsAppCostConfigSchema = new Schema<IWhatsAppCostConfig>(
  {
    provider: { type: String, required: true },
    countryCode: { type: String, required: true },
    messageType: { type: String, required: true },
    costPerMessage: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    effectiveFrom: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

WhatsAppCostConfigSchema.index(
  { provider: 1, countryCode: 1, messageType: 1, effectiveFrom: -1 },
  { unique: true },
);

export default mongoose.models.WhatsAppCostConfig ||
  mongoose.model<IWhatsAppCostConfig>('WhatsAppCostConfig', WhatsAppCostConfigSchema);
