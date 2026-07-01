import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IReview extends ISoftDeleted {
  product?: mongoose.Types.ObjectId;
  showcase?: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  customerName: string;
  rating: number;
  comment: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  location?: string;
  eventType?: string;
  favoriteElement?: string;
  helpfulCount: number;
  helpfulBy?: mongoose.Types.ObjectId[];
  category: 'showcase' | 'event' | 'product';
  verified: boolean;
  createdAt: Date;
  isMock?: boolean;
}

const ReviewSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: false },
    showcase: { type: Schema.Types.ObjectId, ref: 'ShowcaseCollection', required: false },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    location: { type: String, default: 'Ongole' },
    eventType: { type: String, default: 'Traditional Celebration' },
    favoriteElement: { type: String },
    helpfulCount: { type: Number, default: 0 },
    helpfulBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    category: {
      type: String,
      enum: ['showcase', 'event', 'product'],
      default: 'product',
    },
    verified: { type: Boolean, default: false },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ReviewSchema.index({ product: 1, status: 1 });
ReviewSchema.index({ customer: 1 });

// High-Performance Production Compound Index for Category Showcase Feed Sorts
ReviewSchema.index({ category: 1, status: 1, createdAt: -1 });
// Product review page compound index (prevents full scan + in-memory sort)
ReviewSchema.index({ product: 1, status: 1, rating: -1, createdAt: -1 });

ReviewSchema.plugin(SoftDeletePlugin);

const Review = mongoose.model<IReview, SoftDeleteModel<IReview>>('Review', ReviewSchema);
export default Review;
