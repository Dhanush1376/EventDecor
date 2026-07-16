import mongoose, { Schema, Document, Types } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IWhatsAppCampaign extends Document {
  name: string;
  templateId: Types.ObjectId;
  campaignType: 'one_time' | 'recurring' | 'event_based';
  triggerCategory:
    | 'marketing_blast'
    | 'festival'
    | 'birthday'
    | 'abandoned_cart'
    | 'review_reminder'
    | 'win_back'
    | 'custom';
  targetAudience: {
    segment: 'all' | 'past_buyers' | 'abandoned_cart' | 'custom';
    minOrders?: number;
    customPhones?: string[];
    audienceRules?: any;
  };
  status: 'draft' | 'validating' | 'scheduled' | 'processing' | 'paused' | 'completed' | 'failed';
  scheduledAt?: Date;
  cronExpression?: string;
  executionStrategy?: {
    batchSize: number;
    delayBetweenBatchesMs: number;
  };
  cursor?: string;
  metrics: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    costAmount: number;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppCampaignSchema = new Schema(
  {
    name: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate', required: true },
    campaignType: {
      type: String,
      enum: ['one_time', 'recurring', 'event_based'],
      default: 'one_time',
    },
    triggerCategory: {
      type: String,
      enum: [
        'marketing_blast',
        'festival',
        'birthday',
        'abandoned_cart',
        'review_reminder',
        'win_back',
        'custom',
      ],
      default: 'marketing_blast',
    },
    targetAudience: {
      segment: {
        type: String,
        enum: ['all', 'past_buyers', 'abandoned_cart', 'custom'],
        default: 'all',
      },
      minOrders: { type: Number },
      customPhones: [{ type: String }],
      audienceRules: { type: Schema.Types.Mixed },
    },
    status: {
      type: String,
      enum: ['draft', 'validating', 'scheduled', 'processing', 'paused', 'completed', 'failed'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    cronExpression: { type: String },
    executionStrategy: {
      batchSize: { type: Number, default: 500 },
      delayBetweenBatchesMs: { type: Number, default: 2000 },
    },
    cursor: { type: String },
    metrics: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      costAmount: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true },
);

WhatsAppCampaignSchema.index({ status: 1 });
WhatsAppCampaignSchema.index({ scheduledAt: 1 });

WhatsAppCampaignSchema.plugin(SoftDeletePlugin);

export default mongoose.model<IWhatsAppCampaign, SoftDeleteModel<IWhatsAppCampaign>>(
  'WhatsAppCampaign',
  WhatsAppCampaignSchema,
);
