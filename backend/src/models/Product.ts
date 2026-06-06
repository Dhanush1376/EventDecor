import mongoose, { Schema, Document } from 'mongoose';
import logger from '../config/logger';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IRentalPricing {
  daily: number;
  weekly: number;
  monthly: number;
  customDurationEnabled: boolean;
  customPricePerDay: number;
}

export interface IProduct extends ISoftDeleted {
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
  views: number;
  sold: number;
  imageSrc: string;
  images: string[];
  description: string;
  badges: string[];
  dimensions?: string;
  weight?: string;
  seoTitle?: string;
  seoDescription?: string;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  featured: boolean;
  isActive: boolean;
  isNonRefundable: boolean;
  showInGallery: boolean;
  variants: {
    id: string | number;
    name: string;
    value: string;
    price?: number | string;
    stock?: number | string;
  }[];
  // Rental fields
  rentalEnabled: boolean;
  availabilityMode: 'purchase_only' | 'rent_only' | 'both';
  rentalPricing: IRentalPricing;
  securityDeposit: number;
  isDepositRefundable: boolean;
  rentalStock: number;
  rentalMinDays: number;
  rentalMaxDays: number;
  isManualRentalPricing: boolean;
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
    views: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    imageSrc: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String, required: true },
    badges: [{ type: String }],
    dimensions: { type: String },
    weight: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isNonRefundable: { type: Boolean, default: false },
    showInGallery: { type: Boolean, default: false },
    variants: [
      {
        id: { type: Schema.Types.Mixed },
        name: { type: String, required: true },
        value: { type: String, required: true },
        price: { type: Schema.Types.Mixed },
        stock: { type: Schema.Types.Mixed },
      },
    ],
    // Rental fields
    rentalEnabled: { type: Boolean, default: false },
    availabilityMode: {
      type: String,
      enum: ['purchase_only', 'rent_only', 'both'],
      default: 'purchase_only',
    },
    rentalPricing: {
      daily: { type: Number, default: 0, min: 0 },
      weekly: { type: Number, default: 0, min: 0 },
      monthly: { type: Number, default: 0, min: 0 },
      customDurationEnabled: { type: Boolean, default: false },
      customPricePerDay: { type: Number, default: 0, min: 0 },
    },
    securityDeposit: { type: Number, default: 0, min: 0 },
    isDepositRefundable: { type: Boolean, default: true },
    rentalStock: { type: Number, default: 0, min: 0 },
    rentalMinDays: { type: Number, default: 1, min: 1 },
    rentalMaxDays: { type: Number, default: 365, min: 1 },
    isManualRentalPricing: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Indexes
ProductSchema.index(
  { title: 'text', description: 'text', category: 'text', tags: 'text', teluguTitle: 'text' },
  {
    name: 'FullTextIndex',
    weights: { title: 10, category: 5, tags: 5, description: 1, teluguTitle: 8 },
  },
);
ProductSchema.index({ category: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ isActive: 1 });

// High-Performance Production Compound Indexes
ProductSchema.index({ isActive: 1, category: 1, price: 1 });
ProductSchema.index({ isActive: 1, category: 1, price: -1 });
ProductSchema.index({ isActive: 1, category: 1, rating: -1 });
ProductSchema.index({ isActive: 1, category: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, featured: 1, createdAt: -1 });

// Rental Indexes
ProductSchema.index({ isActive: 1, rentalEnabled: 1, category: 1 });
ProductSchema.index({ isActive: 1, availabilityMode: 1, category: 1 });

// Sitemap Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';

ProductSchema.post('save', () => {
  triggerSitemapUpdate();
});

ProductSchema.plugin(SoftDeletePlugin);

const Product = mongoose.model<IProduct, SoftDeleteModel<IProduct>>('Product', ProductSchema);
export default Product;
