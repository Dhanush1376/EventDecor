import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IEvent extends ISoftDeleted {
  title: string;
  subtitle?: string;
  primaryCategory: mongoose.Types.ObjectId;
  secondaryCategories: mongoose.Types.ObjectId[];
  style: string;
  image: string;
  decorCount?: string;
  venueType?: string;
  pricing?: string;
  basePrice: number;
  description: string;
  colorPalette: string[];
  features: string[];
  materialStyle?: string;
  venueSize?: string;
  gallery: string[];
  beforeAfterImages?: {
    before: string;
    after: string;
  };
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
}

const EventSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    primaryCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    secondaryCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    style: { type: String, required: true },
    image: { type: String, required: true },
    decorCount: { type: String },
    venueType: { type: String },
    pricing: { type: String },
    basePrice: { type: Number, default: 35000 },
    description: { type: String, required: true },
    colorPalette: [{ type: String }],
    features: [{ type: String }],
    materialStyle: { type: String },
    venueSize: { type: String },
    gallery: [{ type: String }],
    beforeAfterImages: {
      before: { type: String },
      after: { type: String },
    },
    seoTitle: { type: String },
    seoDescription: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

EventSchema.index(
  { title: 'text', description: 'text', style: 'text', features: 'text' },
  {
    name: 'FullTextIndex',
    weights: { title: 10, style: 5, features: 3, description: 1 },
  },
);
EventSchema.index({ primaryCategory: 1 });
EventSchema.index({ secondaryCategories: 1 });
EventSchema.index({ style: 1 });

// Compound Indexes for public queries
EventSchema.index({ isActive: 1, primaryCategory: 1 });
EventSchema.index({ isActive: 1, secondaryCategories: 1 });
EventSchema.index({ isActive: 1, style: 1 });
EventSchema.index({ isActive: 1, primaryCategory: 1, createdAt: -1 }); // Recommendation candidate fetch
EventSchema.index({ isActive: 1, primaryCategory: 1, basePrice: -1 }); // Search price sort
EventSchema.index({ isActive: 1, createdAt: -1 }); // Global listing sort

import { triggerSitemapUpdate } from '../utils/sitemapGenerator';

EventSchema.post('save', () => {
  triggerSitemapUpdate();
});

EventSchema.plugin(SoftDeletePlugin);

const Event = mongoose.model<IEvent, SoftDeleteModel<IEvent>>('Event', EventSchema);
export default Event;
