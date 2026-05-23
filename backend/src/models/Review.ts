import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  product?: mongoose.Types.ObjectId;
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
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // Usually auto-approved in simpler setups
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
    verified: { type: Boolean, default: true },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ReviewSchema.index({ product: 1, status: 1 });
ReviewSchema.index({ customer: 1 });

// High-Performance Production Compound Index for Category Showcase Feed Sorts
ReviewSchema.index({ category: 1, status: 1, createdAt: -1 });

const Review = mongoose.model<IReview>('Review', ReviewSchema);
export default Review;
