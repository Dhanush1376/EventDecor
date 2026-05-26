import mongoose, { Schema, Document } from 'mongoose';

export interface ITrendingRankingItem {
  targetId: mongoose.Types.ObjectId;
  score: number;
  clickCount: number;
  viewCount: number;
  bookingCount: number;
  wishlistCount: number;
  rank: number;
}

export interface ITrendingSnapshot extends Document {
  period: 'hourly' | 'daily' | 'weekly';
  targetType: 'product' | 'event' | 'gallery' | 'showcase';
  rankings: ITrendingRankingItem[];
  seasonalContext: string;
  snapshotDate: Date;
  createdAt: Date;
}

const TrendingRankingItemSchema = new Schema(
  {
    targetId: { type: Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true, default: 0 },
    clickCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    rank: { type: Number, required: true },
  },
  { _id: false }
);

const TrendingSnapshotSchema: Schema = new Schema(
  {
    period: {
      type: String,
      required: true,
      enum: ['hourly', 'daily', 'weekly'],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['product', 'event', 'gallery', 'showcase'],
    },
    rankings: [TrendingRankingItemSchema],
    seasonalContext: { type: String, default: 'none' },
    snapshotDate: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Indexes ──
TrendingSnapshotSchema.index({ period: 1, targetType: 1, snapshotDate: -1 });

// TTL Index — auto-delete snapshots older than 180 days
TrendingSnapshotSchema.index({ snapshotDate: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const TrendingSnapshot = mongoose.model<ITrendingSnapshot>(
  'TrendingSnapshot',
  TrendingSnapshotSchema
);
export default TrendingSnapshot;
