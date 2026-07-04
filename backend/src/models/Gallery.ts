import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import { indexGallery } from '../services/search/searchIndexer';
import logger from '../config/logger';

export interface IGallery extends ISoftDeleted {
  title: string;
  teluguTitle?: string;
  customerNote?: string;
  complimentaryGift?: {
    enabled: boolean;
    name?: string;
    quantity?: number;
    description?: string;
    displayBadge?: string;
  };
  primaryCategory: mongoose.Types.ObjectId;
  secondaryCategories: mongoose.Types.ObjectId[];
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
    customerNote: { type: String },
    complimentaryGift: {
      enabled: { type: Boolean, default: false },
      name: { type: String, trim: true },
      quantity: { type: Number, min: 1, default: 1 },
      description: { type: String, trim: true },
      displayBadge: { type: String, trim: true },
    },
    primaryCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    secondaryCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
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
    style: 'text',
    teluguTitle: 'text',
    description: 'text',
  },
  {
    name: 'FullTextIndex',
    weights: { title: 10, tags: 8, style: 5, teluguTitle: 8, description: 1 },
  },
);
GallerySchema.index({ primaryCategory: 1 });
GallerySchema.index({ secondaryCategories: 1 });
GallerySchema.index({ event: 1 });
GallerySchema.index({ type: 1 });

// High-Performance Production Compound Indexes
GallerySchema.index({ isActive: 1, primaryCategory: 1, createdAt: -1 });
GallerySchema.index({ isActive: 1, secondaryCategories: 1, createdAt: -1 });
GallerySchema.index({ isActive: 1, type: 1, createdAt: -1 });
GallerySchema.index({ isActive: 1, primaryCategory: 1, views: -1 }); // Recommendation candidate fetch (views sort)
GallerySchema.index({ isActive: 1, views: -1 }); // Global popularity sort (cold-start feed)

import { triggerSitemapUpdate } from '../utils/sitemapGenerator';

GallerySchema.post('save', async function (doc) {
  try {
    triggerSitemapUpdate();
    if (!doc.deletedAt) {
      await indexGallery(doc);
    }
  } catch (err: any) {
    logger.error(`[Search Indexer] Failed to index gallery: ${err.message}`);
  }
});

GallerySchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && !doc.deletedAt) {
      await indexGallery(doc);
    }
  } catch (err: any) {
    logger.error(`[Search Indexer] Failed to index gallery on update: ${err.message}`);
  }
});

GallerySchema.plugin(SoftDeletePlugin);

const Gallery = mongoose.model<IGallery, SoftDeleteModel<IGallery>>('Gallery', GallerySchema);
export default Gallery;
