import mongoose, { Schema, Document } from 'mongoose';
import { DestructionGuard } from '../utils/DestructionGuard';
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

// Protect collection against accidental mass deletions
DestructionGuard(UserInteractionSchema);

// ── Performance Indexes ──
UserInteractionSchema.index({ userId: 1, timestamp: -1 });
UserInteractionSchema.index({ sessionId: 1, timestamp: -1 });
UserInteractionSchema.index({ targetId: 1, eventType: 1 });
UserInteractionSchema.index({ eventType: 1, timestamp: -1 });
UserInteractionSchema.index({ 'metadata.category': 1, eventType: 1, timestamp: -1 });

// Note: TTL index removed to permanently retain all customer interaction and visitor data.

const UserInteraction = mongoose.model<IUserInteraction>('UserInteraction', UserInteractionSchema);
export default UserInteraction;
