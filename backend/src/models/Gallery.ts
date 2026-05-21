import mongoose, { Schema, Document } from 'mongoose';

export interface IGallery extends Document {
  title: string;
  teluguTitle?: string;
  category: string;
  event?: string;
  style?: string;
  image: string;
  video?: string;
  height?: string; // aspect ratio class for Pinterest grid
  colorPalette: string[];
  tags: string[];
  description?: string;
  story?: string;
  linkedProducts: mongoose.Types.ObjectId[];
  similarInspirations: mongoose.Types.ObjectId[];
  views: number;
  likes: number;
  isActive: boolean;
  type: 'inspiration' | 'real-event';
}

const GallerySchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    teluguTitle: { type: String },
    category: { type: String, required: true },
    event: { type: String },
    style: { type: String },
    image: { type: String, required: true },
    video: { type: String },
    type: { type: String, enum: ['inspiration', 'real-event'], default: 'inspiration' },
    height: { type: String, default: 'aspect-square' },
    colorPalette: [{ type: String }],
    tags: [{ type: String }],
    description: { type: String },
    story: { type: String },
    linkedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    similarInspirations: [{ type: Schema.Types.ObjectId, ref: 'Gallery' }],
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GallerySchema.index({ title: 'text', tags: 'text' });
GallerySchema.index({ category: 1 });
GallerySchema.index({ event: 1 });
GallerySchema.index({ type: 1 });

// High-Performance Production Compound Indexes
GallerySchema.index({ isActive: 1, category: 1, createdAt: -1 });
GallerySchema.index({ isActive: 1, type: 1, createdAt: -1 });

// Sitemap Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
GallerySchema.post('save', () => { triggerSitemapUpdate(); });
GallerySchema.post('deleteOne', () => { triggerSitemapUpdate(); });
GallerySchema.post('findOneAndDelete', () => { triggerSitemapUpdate(); });

const Gallery = mongoose.model<IGallery>('Gallery', GallerySchema);
export default Gallery;

