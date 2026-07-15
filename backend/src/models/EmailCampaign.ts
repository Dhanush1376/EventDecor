import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IEmailCampaign extends ISoftDeleted {
  title: string;
  subject: string;
  templateId?: mongoose.Types.ObjectId;
  customHtml?: string;
  targetAudience: {
    role?: 'user' | 'customer' | 'admin' | 'manager' | 'coordinator' | 'all';
    consentedOnly: boolean;
  };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  stats: {
    sentCount: number;
    openCount: number;
    clickCount: number;
    unsubscribeCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate' },
    customHtml: { type: String },
    targetAudience: {
      role: {
        type: String,
        enum: ['user', 'customer', 'admin', 'manager', 'coordinator', 'all'],
        default: 'all',
      },
      consentedOnly: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    stats: {
      sentCount: { type: Number, default: 0 },
      openCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      unsubscribeCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

EmailCampaignSchema.index({ status: 1 });
EmailCampaignSchema.index({ scheduledAt: 1 }, { sparse: true });
EmailCampaignSchema.index({ createdAt: -1 });

EmailCampaignSchema.plugin(SoftDeletePlugin);

const EmailCampaign = mongoose.model<IEmailCampaign, SoftDeleteModel<IEmailCampaign>>(
  'EmailCampaign',
  EmailCampaignSchema,
);

export default EmailCampaign;
