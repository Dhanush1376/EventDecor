import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  subtitle?: string;
  category: string;
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
    category: { type: String, required: true },
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
  { timestamps: true }
);

EventSchema.index({ title: 'text', description: 'text', category: 'text', style: 'text', features: 'text' }, { name: 'FullTextIndex', weights: { title: 10, category: 5, style: 5, features: 3, description: 1 } });
EventSchema.index({ category: 1 });
EventSchema.index({ style: 1 });

// Compound Indexes for public queries
EventSchema.index({ isActive: 1, category: 1 });
EventSchema.index({ isActive: 1, style: 1 });
EventSchema.index({ isActive: 1, category: 1, createdAt: -1 }); // Recommendation candidate fetch
EventSchema.index({ isActive: 1, category: 1, basePrice: -1 }); // Search price sort
EventSchema.index({ isActive: 1, createdAt: -1 }); // Global listing sort

// Sitemap Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
EventSchema.post('save', () => { triggerSitemapUpdate(); });
EventSchema.post('deleteOne', () => { triggerSitemapUpdate(); });
EventSchema.post('findOneAndDelete', () => { triggerSitemapUpdate(); });

const Event = mongoose.model<IEvent>('Event', EventSchema);
export default Event;

