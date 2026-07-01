import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IShowcaseItem {
  name: string;
  defaultQty: number;
  condition: 'excellent' | 'good' | 'worn' | 'maintenance';
}

export interface IShowcaseCollection extends ISoftDeleted {
  title: string;
  subtitle: string;
  category: string; // e.g. 'engagement_gift', 'tambulam_showcase', 'coconut_decor', 'telugu_heritage'
  rentalPrice: number;
  strikingPrice?: number;
  description: string;
  image: string;
  gallery: string[];
  inclusions: IShowcaseItem[];
  colorPalette: string[];
  suggestedProps: string[];
  setupTimeHours: number;
  popularityScore: number;
  rating?: number;
  reviewCount?: number;
  seoTitle?: string;
  seoDescription?: string;
  featured: boolean;
  showInGallery: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShowcaseItemSchema = new Schema({
  name: { type: String, required: true },
  defaultQty: { type: Number, default: 1 },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'worn', 'maintenance'],
    default: 'excellent',
  },
});

const ShowcaseCollectionSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    category: { type: String, required: true },
    rentalPrice: { type: Number, required: true },
    strikingPrice: { type: Number },
    description: { type: String, required: true },
    image: { type: String, required: true },
    gallery: [{ type: String }],
    inclusions: [ShowcaseItemSchema],
    colorPalette: [{ type: String }],
    suggestedProps: [{ type: String }],
    setupTimeHours: { type: Number, default: 2 },
    popularityScore: { type: Number, default: 0 },
    rating: { type: Number, default: 4.9 },
    reviewCount: { type: Number, default: 42 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    featured: { type: Boolean, default: false },
    showInGallery: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ShowcaseCollectionSchema.index({ title: 'text', description: 'text' });
ShowcaseCollectionSchema.index({ category: 1 });
ShowcaseCollectionSchema.index({ isActive: 1, category: 1 });
ShowcaseCollectionSchema.index({ isActive: 1, popularityScore: -1 });
ShowcaseCollectionSchema.index({ featured: 1 });
ShowcaseCollectionSchema.index({ showInGallery: 1 });

import { triggerSitemapUpdate } from '../utils/sitemapGenerator';

ShowcaseCollectionSchema.post('save', () => {
  triggerSitemapUpdate();
});

ShowcaseCollectionSchema.plugin(SoftDeletePlugin);

const ShowcaseCollection = mongoose.model<
  IShowcaseCollection,
  SoftDeleteModel<IShowcaseCollection>
>('ShowcaseCollection', ShowcaseCollectionSchema);
export default ShowcaseCollection;
