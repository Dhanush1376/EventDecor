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
  reviewImages?: {
    secureUrl: string;
    publicId: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
    uploadedAt?: Date;
  }[];
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
  internalNotes?: string;
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
    reviewImages: [
      {
        secureUrl: { type: String, required: true },
        publicId: { type: String, required: false },
        width: { type: Number },
        height: { type: Number },
        bytes: { type: Number },
        format: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    moderationReason: { type: String },
    internalNotes: { type: String },
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

// Index for fast lookup when deleting from Cloudinary
ReviewSchema.index({ 'reviewImages.publicId': 1 });

// Duplicate protection: maximum 1 review per customer per product
ReviewSchema.index(
  { customer: 1, product: 1 },
  { unique: true, partialFilterExpression: { product: { $type: 'objectId' } } },
);

ReviewSchema.plugin(SoftDeletePlugin);

const Review = mongoose.model<IReview, SoftDeleteModel<IReview>>('Review', ReviewSchema);
export default Review;
