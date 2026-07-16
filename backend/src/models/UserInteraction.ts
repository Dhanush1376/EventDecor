import mongoose, { Schema, Document } from 'mongoose';
import storeSettingsService from '../services/StoreSettingsService';
export type InteractionEventType =
  | 'product_view'
  | 'product_click'
  | 'gallery_view'
  | 'gallery_click'
  | 'event_view'
  | 'event_click'
  | 'showcase_view'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'cart_add'
  | 'cart_remove'
  | 'purchase'
  | 'booking'
  | 'search'
  | 'category_explore'
  | 'review_read'
  | 'review_submit'
  | 'search_executed'
  | 'search_suggestion_clicked'
  | 'search_zero_results';

export type TargetType = 'product' | 'event' | 'gallery' | 'showcase' | 'search_event';

export interface IUserInteraction extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  eventType: InteractionEventType;
  targetType: TargetType;
  targetId?: mongoose.Types.ObjectId;
  metadata: {
    category?: string;
    style?: string;
    tags?: string[];
    priceRange?: string;
    searchQuery?: string;
    dwellTimeMs?: number;
    scrollDepth?: number;
    source?: string;
  };
  timestamp: Date;
  createdAt: Date;
  expiresAt?: Date;
}

const UserInteractionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, required: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'product_view',
        'product_click',
        'gallery_view',
        'gallery_click',
        'event_view',
        'event_click',
        'showcase_view',
        'wishlist_add',
        'wishlist_remove',
        'cart_add',
        'cart_remove',
        'purchase',
        'booking',
        'search',
        'category_explore',
        'review_read',
        'review_submit',
        'search_executed',
        'search_suggestion_clicked',
        'search_zero_results',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['product', 'event', 'gallery', 'showcase', 'search_event'],
    },
    targetId: { type: Schema.Types.ObjectId },
    metadata: {
      category: { type: String },
      style: { type: String },
      tags: [{ type: String }],
      priceRange: { type: String, enum: ['budget', 'mid', 'premium', 'luxury'] },
      searchQuery: { type: String },
      dwellTimeMs: { type: Number },
      scrollDepth: { type: Number, min: 0, max: 100 },
      source: { type: String },
    },
    timestamp: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Performance Indexes ──
UserInteractionSchema.index({ userId: 1, timestamp: -1 });
UserInteractionSchema.index({ sessionId: 1, timestamp: -1 });
UserInteractionSchema.index({ targetId: 1, eventType: 1 });
UserInteractionSchema.index({ eventType: 1, timestamp: -1 });
UserInteractionSchema.index({ 'metadata.category': 1, eventType: 1, timestamp: -1 });

// Dynamic TTL index (expiresAt calculated on save)
UserInteractionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

UserInteractionSchema.pre('save', async function () {
  if (!this.expiresAt) {
    try {
      const settings = await storeSettingsService.getSettings();
      const days = settings.retentionPolicies?.userInteractionsDays || 30;
      this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } catch (err) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days fallback
    }
  }
});

const UserInteraction = mongoose.model<IUserInteraction>('UserInteraction', UserInteractionSchema);
export default UserInteraction;
