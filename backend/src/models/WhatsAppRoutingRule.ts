import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppRoutingRule extends Document {
  category: string; // e.g., 'order', 'marketing', 'otp'
  preferredProvider: string; // e.g., 'meta_cloud'
  fallbackProviders: string[];
  conditions?: Record<string, any>; // optional logic
  enabled: boolean;
  priority: number;
}

const WhatsAppRoutingRuleSchema = new Schema<IWhatsAppRoutingRule>(
  {
    category: { type: String, required: true, unique: true },
    preferredProvider: { type: String, required: true },
    fallbackProviders: [{ type: String }],
    conditions: { type: Schema.Types.Mixed },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
  },
  { timestamps: true },
);

WhatsAppRoutingRuleSchema.index({ priority: -1, enabled: -1 });

export default mongoose.models.WhatsAppRoutingRule ||
  mongoose.model<IWhatsAppRoutingRule>('WhatsAppRoutingRule', WhatsAppRoutingRuleSchema);
