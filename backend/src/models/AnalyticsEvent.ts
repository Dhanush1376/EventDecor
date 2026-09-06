import mongoose, { Schema, Document } from 'mongoose';
import { DestructionGuard } from '../utils/DestructionGuard';

export interface IAnalyticsEvent extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  eventType: string;
  page?: string;
  referrer?: string;
  metadata?: {
    scrollDepth?: number;
    timeSpentMs?: number;
    buttonId?: string;
    searchQuery?: string;
    filterValues?: any;
    sortBy?: string;
    entryPage?: string;
    exitPage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referralChannel?: string;
    searchIntent?: string;
    recommendationSource?: string;
    recommendedProductId?: string;
    recommendationPosition?: number;
    previousPage?: string;
    navigationDepth?: number;
    [key: string]: any;
  };
  device?: {
    type?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    browser?: string;
    os?: string;
    screenSize?: string;
    networkType?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  timestamp: Date;
  expiresAt?: Date;
}

const AnalyticsEventSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String, required: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'page_view',
        'page_exit',
        'button_click',
        'banner_click',
        'cta_click',
        'filter_use',
        'sort_use',
        'search_bar_use',
        'menu_interaction',
        'scroll_depth',
        'checkout_started',
        'checkout_completed',
        'payment_success',
        'payment_failure',
        'coupon_applied',
        'coupon_removed',
        'login',
        'logout',
        'ai_search_used',
        'visual_search_used',
        'recommendation_shown',
        'recommendation_clicked',
        'recommendation_carted',
        'recommendation_purchased',
      ],
    },
    page: { type: String },
    referrer: { type: String },
    metadata: {
      scrollDepth: Number,
      timeSpentMs: Number,
      buttonId: String,
      searchQuery: String,
      filterValues: Schema.Types.Mixed,
      sortBy: String,
      entryPage: String,
      exitPage: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      utmTerm: String,
      utmContent: String,
      referralChannel: {
        type: String,
        enum: [
          'google',
          'instagram',
          'facebook',
          'whatsapp',
          'direct',
          'referral',
          'organic',
          'email',
          'other',
        ],
      },
      searchIntent: {
        type: String,
        enum: [
          'wedding_decor',
          'birthday',
          'rental',
          'premium',
          'budget',
          'diy',
          'corporate',
          'seasonal',
          'gift',
          'other',
        ],
      },
      recommendationSource: String,
      recommendedProductId: String,
      recommendationPosition: Number,
      previousPage: String,
      navigationDepth: Number,
    },
    device: {
      type: { type: String, enum: ['mobile', 'desktop', 'tablet', 'unknown'], default: 'unknown' },
      browser: String,
      os: String,
      screenSize: String,
      networkType: String,
    },
    location: {
      country: String,
      region: String,
      city: String,
    },
    timestamp: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: false },
);

// Allow flexible metadata
AnalyticsEventSchema.add({
  metadata: { type: Schema.Types.Mixed },
});

// Protect collection against accidental mass deletions
DestructionGuard(AnalyticsEventSchema);

// Indexes for fast querying and aggregation
AnalyticsEventSchema.index({ userId: 1, timestamp: 1 });
AnalyticsEventSchema.index({ sessionId: 1, timestamp: 1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: 1 });
AnalyticsEventSchema.index({ page: 1, timestamp: 1 });
AnalyticsEventSchema.index({ 'metadata.referralChannel': 1, timestamp: 1 });
AnalyticsEventSchema.index({ 'metadata.searchIntent': 1, timestamp: 1 });

// Note: TTL index removed to permanently retain all visitor, clickstream, and traffic analytics.

const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
export default AnalyticsEvent;
