import mongoose, { Schema, Document } from 'mongoose';
import logger from '../config/logger';

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
    height: { type: String, default: 'aspect-square' },
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

// Sitemap and Cloudinary Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';

GallerySchema.post('save', () => {
  triggerSitemapUpdate();
});

const cleanupCloudinaryImages = async (doc: any) => {
  if (!doc) return;
  const urlsToClean: string[] = [];
  if (doc.image) urlsToClean.push(doc.image);
  if (doc.video) urlsToClean.push(doc.video);

  for (const url of urlsToClean) {
    const publicId = extractPublicId(url);
    if (publicId) {
      deleteFromCloudinary(publicId).catch((err) =>
        logger.error(`[Cloudinary GC] Failed to delete orphaned gallery media: ${url}`, err),
      );
    }
  }
};

GallerySchema.post('deleteOne', { document: true, query: false }, async function () {
  triggerSitemapUpdate();
  await cleanupCloudinaryImages(this);
});

GallerySchema.post('findOneAndDelete', async function (doc) {
  triggerSitemapUpdate();
  await cleanupCloudinaryImages(doc);
});

const Gallery = mongoose.model<IGallery>('Gallery', GallerySchema);
export default Gallery;
