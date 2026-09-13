import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IDesignBlock {
  id: string;
  type:
    | 'header'
    | 'banner'
    | 'text'
    | 'product'
    | 'productGrid'
    | 'cartSummary'
    | 'coupon'
    | 'button'
    | 'divider'
    | 'spacer'
    | 'social'
    | 'footer';
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export interface IAudienceFilterRule {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'in_range'
    | 'is_true'
    | 'is_false';
  value: any;
  combinator?: 'AND' | 'OR';
}

export interface IEmailCampaign extends ISoftDeleted {
  title: string;
  subject: string;
  previewText?: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  campaignType: 'one_time' | 'scheduled' | 'automated';
  category:
    | 'promotional'
    | 'abandoned_cart'
    | 'welcome'
    | 'first_purchase'
    | 'post_purchase'
    | 'review_request'
    | 're_engagement'
    | 'win_back'
    | 'seasonal'
    | 'announcement';
  templateId?: mongoose.Types.ObjectId;
  customHtml?: string;
  designBlocks?: IDesignBlock[];
  audienceCriteria?: {
    type: 'all' | 'segment' | 'custom_filter' | 'specific_customers';
    segmentId?: mongoose.Types.ObjectId;
    customerIds?: mongoose.Types.ObjectId[];
    filterRules?: IAudienceFilterRule[];
  };
  targetAudience: {
    role?: 'user' | 'customer' | 'admin' | 'manager' | 'coordinator' | 'all';
    consentedOnly: boolean;
  };
  status:
    | 'draft'
    | 'scheduled'
    | 'sending'
    | 'sent'
    | 'partially_sent'
    | 'paused'
    | 'cancelled'
    | 'failed';
  frequencyGuard?: {
    enabled: boolean;
    maxPerDay?: number;
  };
  scheduledAt?: Date;
  sentAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  stats: {
    recipientCount: number;
    sentCount: number;
    deliveredCount: number;
    openCount: number;
    uniqueOpenCount: number;
    clickCount: number;
    uniqueClickCount: number;
    bounceCount: number;
    unsubscribeCount: number;
    ordersCount: number;
    revenueGenerated: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, trim: true },
    senderName: { type: String, trim: true },
    senderEmail: { type: String, trim: true, lowercase: true },
    replyTo: { type: String, trim: true, lowercase: true },
    campaignType: {
      type: String,
      enum: ['one_time', 'scheduled', 'automated'],
      default: 'one_time',
    },
    category: {
      type: String,
      enum: [
        'promotional',
        'abandoned_cart',
        'welcome',
        'first_purchase',
        'post_purchase',
        'review_request',
        're_engagement',
        'win_back',
        'seasonal',
        'announcement',
      ],
      default: 'promotional',
    },
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate' },
    customHtml: { type: String },
    designBlocks: { type: Array, default: [] },
    audienceCriteria: {
      type: {
        type: String,
        enum: ['all', 'segment', 'custom_filter', 'specific_customers'],
        default: 'all',
      },
      segmentId: { type: Schema.Types.ObjectId, ref: 'CampaignSegment' },
      customerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      filterRules: [
        {
          field: { type: String, required: true },
          operator: { type: String, required: true },
          value: { type: Schema.Types.Mixed },
          combinator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
        },
      ],
    },
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
      enum: [
        'draft',
        'scheduled',
        'sending',
        'sent',
        'partially_sent',
        'paused',
        'cancelled',
        'failed',
      ],
      default: 'draft',
    },
    frequencyGuard: {
      enabled: { type: Boolean, default: true },
      maxPerDay: { type: Number, default: 2 },
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    completedAt: { type: Date },
    pausedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    stats: {
      recipientCount: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      deliveredCount: { type: Number, default: 0 },
      openCount: { type: Number, default: 0 },
      uniqueOpenCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      uniqueClickCount: { type: Number, default: 0 },
      bounceCount: { type: Number, default: 0 },
      unsubscribeCount: { type: Number, default: 0 },
      ordersCount: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

EmailCampaignSchema.index({ status: 1 });
EmailCampaignSchema.index({ category: 1 });
EmailCampaignSchema.index({ campaignType: 1 });
EmailCampaignSchema.index({ scheduledAt: 1 }, { sparse: true });
EmailCampaignSchema.index({ createdAt: -1 });

EmailCampaignSchema.plugin(SoftDeletePlugin);

const EmailCampaign = mongoose.model<IEmailCampaign, SoftDeleteModel<IEmailCampaign>>(
  'EmailCampaign',
  EmailCampaignSchema,
);

export default EmailCampaign;
