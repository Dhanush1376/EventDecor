import mongoose, { Schema, Document } from 'mongoose';

export interface IVisualSearchLog extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  imageHash: string;
  thumbnailUrl?: string;
  provider: string;
  aiLabels: string[];
  aiCategory: string;
  aiConfidence: number;
  aiAttributes: Record<string, string>;
  matchedProductIds: mongoose.Types.ObjectId[];
  bestMatchProductId?: mongoose.Types.ObjectId;
  resultCount: number;
  searchDurationMs: number;
  userInteraction: 'none' | 'clicked' | 'added_to_cart' | 'purchased';
  searchSource: 'camera' | 'upload' | 'drag_drop';
  ip: string;
  userAgent: string;
  errorMessage?: string;
  createdAt: Date;
}

const VisualSearchLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, required: true },
    imageHash: { type: String, required: true, index: true },
    thumbnailUrl: { type: String },
    provider: { type: String, required: true },
    aiLabels: [{ type: String }],
    aiCategory: { type: String, default: '' },
    aiConfidence: { type: Number, default: 0, min: 0, max: 1 },
    aiAttributes: { type: Schema.Types.Mixed, default: {} },
    matchedProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    bestMatchProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    resultCount: { type: Number, default: 0 },
    searchDurationMs: { type: Number, default: 0 },
    userInteraction: {
      type: String,
      enum: ['none', 'clicked', 'added_to_cart', 'purchased'],
      default: 'none',
    },
    searchSource: {
      type: String,
      enum: ['camera', 'upload', 'drag_drop'],
      default: 'upload',
    },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

// Indexes for analytics queries
VisualSearchLogSchema.index({ createdAt: -1 });
VisualSearchLogSchema.index({ aiCategory: 1, createdAt: -1 });
VisualSearchLogSchema.index({ userInteraction: 1, createdAt: -1 });
VisualSearchLogSchema.index({ provider: 1, createdAt: -1 });

// Auto-expire logs after 90 days to manage storage
VisualSearchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const VisualSearchLog = mongoose.model<IVisualSearchLog>('VisualSearchLog', VisualSearchLogSchema);
export default VisualSearchLog;
