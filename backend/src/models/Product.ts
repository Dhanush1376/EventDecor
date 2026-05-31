import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  teluguTitle?: string;
  slug: string;
  category: string;
  material?: string;
  tags: string[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  imageSrc: string;
  images: string[];
  description: string;
  badges: string[];
  dimensions?: string;
  weight?: string;
  seoTitle?: string;
  seoDescription?: string;
  stock: number;
  featured: boolean;
  isActive: boolean;
  isNonRefundable: boolean;
  showInGallery: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    teluguTitle: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    material: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    imageSrc: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String, required: true },
    badges: [{ type: String }],
    dimensions: { type: String },
    weight: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isNonRefundable: { type: Boolean, default: false },
    showInGallery: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProductSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text', teluguTitle: 'text' }, { name: 'FullTextIndex', weights: { title: 10, category: 5, tags: 5, description: 1, teluguTitle: 8 } });
ProductSchema.index({ category: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ isActive: 1 });

// High-Performance Production Compound Indexes
ProductSchema.index({ isActive: 1, category: 1, price: 1 });
ProductSchema.index({ isActive: 1, category: 1, price: -1 });
ProductSchema.index({ isActive: 1, category: 1, rating: -1 });
ProductSchema.index({ isActive: 1, category: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, featured: 1, createdAt: -1 });

// Sitemap Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
ProductSchema.post('save', () => { triggerSitemapUpdate(); });
ProductSchema.post('deleteOne', () => { triggerSitemapUpdate(); });
ProductSchema.post('findOneAndDelete', () => { triggerSitemapUpdate(); });

const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;

