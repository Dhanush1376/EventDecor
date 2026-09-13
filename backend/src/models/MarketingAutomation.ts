import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import { IDesignBlock } from './EmailCampaign';

export interface IAutomationStep {
  stepNumber: number;
  delayHours: number;
  subject: string;
  previewText?: string;
  discountCode?: string;
  designBlocks?: IDesignBlock[];
  customHtml?: string;
}

export interface IMarketingAutomation extends ISoftDeleted {
  name: string;
  description?: string;
  triggerType:
    | 'abandoned_cart'
    | 'welcome'
    | 'first_purchase'
    | 'post_purchase'
    | 'review_request'
    | 'win_back';
  status: 'active' | 'paused' | 'draft';
  steps: IAutomationStep[];
  stopConditions: {
    onOrderPlaced: boolean;
    onCartCleared: boolean;
    onUnsubscribed: boolean;
  };
  frequencyGuard: {
    enabled: boolean;
    maxPerWeek?: number;
  };
  stats: {
    triggeredCount: number;
    sentCount: number;
    convertedCount: number;
    revenueRecovered: number;
  };
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingAutomationSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    triggerType: {
      type: String,
      enum: [
        'abandoned_cart',
        'welcome',
        'first_purchase',
        'post_purchase',
        'review_request',
        'win_back',
      ],
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'draft'],
      default: 'draft',
    },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        delayHours: { type: Number, required: true, default: 1 },
        subject: { type: String, required: true },
        previewText: { type: String },
        discountCode: { type: String },
        designBlocks: { type: Array, default: [] },
        customHtml: { type: String },
      },
    ],
    stopConditions: {
      onOrderPlaced: { type: Boolean, default: true },
      onCartCleared: { type: Boolean, default: true },
      onUnsubscribed: { type: Boolean, default: true },
    },
    frequencyGuard: {
      enabled: { type: Boolean, default: true },
      maxPerWeek: { type: Number, default: 3 },
    },
    stats: {
      triggeredCount: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      convertedCount: { type: Number, default: 0 },
      revenueRecovered: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

MarketingAutomationSchema.index({ status: 1 });

MarketingAutomationSchema.plugin(SoftDeletePlugin);

const MarketingAutomation = mongoose.model<
  IMarketingAutomation,
  SoftDeleteModel<IMarketingAutomation>
>('MarketingAutomation', MarketingAutomationSchema);

export default MarketingAutomation;
