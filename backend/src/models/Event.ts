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
  { timestamps: true },
);

EventSchema.index(
  { title: 'text', description: 'text', category: 'text', style: 'text', features: 'text' },
  {
    name: 'FullTextIndex',
    weights: { title: 10, category: 5, style: 5, features: 3, description: 1 },
  },
);
EventSchema.index({ category: 1 });
EventSchema.index({ style: 1 });

// Compound Indexes for public queries
EventSchema.index({ isActive: 1, category: 1 });
EventSchema.index({ isActive: 1, style: 1 });
EventSchema.index({ isActive: 1, category: 1, createdAt: -1 }); // Recommendation candidate fetch
EventSchema.index({ isActive: 1, category: 1, basePrice: -1 }); // Search price sort
EventSchema.index({ isActive: 1, createdAt: -1 }); // Global listing sort

// Sitemap and Cloudinary Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';

EventSchema.post('save', () => {
  triggerSitemapUpdate();
});

const cleanupCloudinaryImages = async (doc: any) => {
  if (!doc) return;
  const urlsToClean: string[] = [];
  if (doc.image) urlsToClean.push(doc.image);
  if (doc.gallery && Array.isArray(doc.gallery)) urlsToClean.push(...doc.gallery);
  if (doc.beforeAfterImages) {
    if (doc.beforeAfterImages.before) urlsToClean.push(doc.beforeAfterImages.before);
    if (doc.beforeAfterImages.after) urlsToClean.push(doc.beforeAfterImages.after);
  }

  for (const url of urlsToClean) {
    const publicId = extractPublicId(url);
    if (publicId) {
      deleteFromCloudinary(publicId).catch((err) =>
        console.error(`[Cloudinary GC] Failed to delete orphaned event image: ${url}`, err),
      );
    }
  }
};

EventSchema.post('deleteOne', { document: true, query: false }, async function () {
  triggerSitemapUpdate();
  await cleanupCloudinaryImages(this);
});

EventSchema.post('findOneAndDelete', async function (doc) {
  triggerSitemapUpdate();
  await cleanupCloudinaryImages(doc);
});

const Event = mongoose.model<IEvent>('Event', EventSchema);
export default Event;
