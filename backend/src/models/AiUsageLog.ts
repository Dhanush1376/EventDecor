import mongoose, { Schema } from 'mongoose';

export interface IAiUsageLog {
  feature: string; // 'product-ai', 'seo', 'chat', 'email', etc.
  providerId?: mongoose.Types.ObjectId;
  providerName: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AiUsageLogSchema: Schema = new Schema({
  feature: { type: String, required: true, index: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'AiProvider', index: true },
  providerName: { type: String, required: true },
  model: { type: String, required: true },
  latencyMs: { type: Number, default: 0 },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  success: { type: Boolean, required: true },
  error: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  // TTL Index: Auto-delete documents after 90 days
  createdAt: { type: Date, default: Date.now, expires: '90d', index: true },
});

const AiUsageLog = mongoose.model<IAiUsageLog>('AiUsageLog', AiUsageLogSchema);
export default AiUsageLog;
