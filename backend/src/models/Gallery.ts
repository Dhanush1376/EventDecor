import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IGallery extends ISoftDeleted {
  title: string;
  teluguTitle?: string;
  category: string;
  event?: string;
  style?: string;
  image: string;
  video?: string;
  height?: string; // aspect ratio class for Pinterest grid
  aspectRatio?: string;
  imageWidth?: number;
  imageHeight?: number;
  colorPalette: string[];
  tags: string[];
  description?: string;
  story?: string;
  linkedProducts: mongoose.Types.ObjectId[];
  similarInspirations: mongoose.Types.ObjectId[];
  views: number;
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
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
    height: { type: String, default: 'aspect-[3/4]' },
    aspectRatio: { type: String },
    imageWidth: { type: Number },
    imageHeight: { type: Number },
    colorPalette: [{ type: String }],
    tags: [{ type: String }],
    description: { type: String },
    story: { type: String },
    linkedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    similarInspirations: [{ type: Schema.Types.ObjectId, ref: 'Gallery' }],
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

GallerySchema.index(
  {
    title: 'text',
    tags: 'text',
    category: 'text',
    style: 'text',
    teluguTitle: 'text',
    description: 'text',
  },
  {
    name: 'FullTextIndex',
    weights: { title: 10, tags: 8, category: 5, style: 5, teluguTitle: 8, description: 1 },
  },
);
GallerySchema.index({ category: 1 });
GallerySchema.index({ event: 1 });
GallerySchema.index({ type: 1 });

// High-Performance Production Compound Indexes
GallerySchema.index({ isActive: 1, category: 1, createdAt: -1 });
GallerySchema.index({ isActive: 1, type: 1, createdAt: -1 });
GallerySchema.index({ isActive: 1, category: 1, views: -1 }); // Recommendation candidate fetch (views sort)
GallerySchema.index({ isActive: 1, views: -1 }); // Global popularity sort (cold-start feed)

import { triggerSitemapUpdate } from '../utils/sitemapGenerator';

GallerySchema.post('save', () => {
  triggerSitemapUpdate();
});

GallerySchema.plugin(SoftDeletePlugin);

const Gallery = mongoose.model<IGallery, SoftDeleteModel<IGallery>>('Gallery', GallerySchema);
export default Gallery;
