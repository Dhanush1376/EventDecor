import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import { indexProduct } from '../services/search/searchIndexer';
import logger from '../config/logger';

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
  customerNote?: string;
  complimentaryGift?: {
    enabled: boolean;
    name?: string;
    quantity?: number;
    description?: string;
    displayBadge?: string;
  };
  slug: string;
  primaryCategory: mongoose.Types.ObjectId;
  secondaryCategories: mongoose.Types.ObjectId[];
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
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  weight?: number;
  seoTitle?: string;
  seoDescription?: string;
  stock: number;
  reservedStock: number;
  inventory?: {
    available: number;
    reserved: number;
    production: number;
    packing: number;
    transit: number;
    rental: number;
    maintenance: number;
    returned: number;
    damaged: number;
    lost: number;
    qualityHold: number;
  };
  sku?: string;
  barcode?: string;
  productUuid?: string;
  qrCode?: string;
  qrSignature?: string;
  warehouseLocations?: {
    warehouseId: string;
    zoneId: string;
    aisleId: string;
    shelfId: string;
    binId: string;
    fullPath: string;
    quantity: number;
  }[];
  batchNumber?: string;
  manufacturingDate?: Date;
  preparationTimeDays?: number;
  maxStock?: number;
  fragilityLevel?: number;
  packageSize?: 'small' | 'medium' | 'large' | 'oversized';
  version: number;
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
  customizationConfig?: {
    enabled: boolean;
    required: boolean;
    label: string;
    placeholder: string;
    maxLength: number;
    helperText?: string;
  };
  // AI Visual Search metadata
  aiTags?: string[];
  aiCategory?: string;
  aiAttributes?: Record<string, string>;
  imageHash?: string;

  // Return Settings
  returnSettings?: {
    returnWindow?: number;
    exchangeWindow?: number;
    refundType?: 'full' | 'partial' | 'store_credit' | 'no_refund';
    restockingFeePercent?: number;
    returnShippingFee?: number;
    inspectionRequired?: boolean;
    replacementAllowed?: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    teluguTitle: { type: String, trim: true },
    customerNote: { type: String, trim: true },
    complimentaryGift: {
      enabled: { type: Boolean, default: false },
      name: { type: String, trim: true },
      quantity: { type: Number, min: 1, default: 1 },
      description: { type: String, trim: true },
      displayBadge: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    primaryCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    secondaryCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
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
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    weight: { type: Number },
    seoTitle: { type: String },
    seoDescription: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    inventory: {
      available: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      production: { type: Number, default: 0 },
      packing: { type: Number, default: 0 },
      transit: { type: Number, default: 0 },
      rental: { type: Number, default: 0 },
      maintenance: { type: Number, default: 0 },
      returned: { type: Number, default: 0 },
      damaged: { type: Number, default: 0 },
      lost: { type: Number, default: 0 },
      qualityHold: { type: Number, default: 0 },
    },
    sku: { type: String, unique: true, sparse: true, index: true },
    barcode: { type: String, unique: true, sparse: true, index: true },
    productUuid: { type: String, index: true },
    qrCode: { type: String },
    qrSignature: { type: String },
    warehouseLocations: [
      {
        warehouseId: { type: String },
        zoneId: { type: String },
        aisleId: { type: String },
        shelfId: { type: String },
        binId: { type: String },
        fullPath: { type: String },
        quantity: { type: Number, default: 0 },
      },
    ],
    batchNumber: { type: String },
    manufacturingDate: { type: Date },
    preparationTimeDays: { type: Number, default: 3 },
    maxStock: { type: Number },
    fragilityLevel: { type: Number, min: 1, max: 5, default: 1 },
    packageSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'oversized'],
      default: 'medium',
    },
    version: { type: Number, default: 1 },
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
    customizationConfig: {
      enabled: { type: Boolean, default: false },
      required: { type: Boolean, default: false },
      label: { type: String, default: 'Customization Note' },
      placeholder: { type: String, default: 'Enter customization details' },
      maxLength: { type: Number, default: 500, max: 2000 },
      helperText: { type: String },
    },
    // AI Visual Search metadata
    aiTags: [{ type: String, trim: true }],
    aiCategory: { type: String, trim: true },
    aiAttributes: { type: Schema.Types.Mixed, default: {} },
    imageHash: { type: String, trim: true, index: true },

    // Return Settings
    returnSettings: {
      returnWindow: { type: Number, default: null },
      exchangeWindow: { type: Number, default: null },
      refundType: {
        type: String,
        enum: ['full', 'partial', 'store_credit', 'no_refund'],
        default: 'full',
      },
      restockingFeePercent: { type: Number, default: 0 },
      returnShippingFee: { type: Number, default: 0 },
      inspectionRequired: { type: Boolean, default: true },
      replacementAllowed: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
ProductSchema.index(
  { title: 'text', description: 'text', tags: 'text', teluguTitle: 'text' },
  {
    name: 'FullTextIndex',
    weights: { title: 10, tags: 5, description: 1, teluguTitle: 8 },
  },
);
ProductSchema.index({ primaryCategory: 1 });
ProductSchema.index({ secondaryCategories: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ slug: 1, isActive: 1 });

// High-Performance Production Compound Indexes
ProductSchema.index({ isActive: 1, primaryCategory: 1, price: 1 });
ProductSchema.index({ isActive: 1, primaryCategory: 1, price: -1 });
ProductSchema.index({ isActive: 1, primaryCategory: 1, rating: -1 });
ProductSchema.index({ isActive: 1, primaryCategory: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, secondaryCategories: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, featured: 1, createdAt: -1 });

// Rental Indexes
ProductSchema.index({ isActive: 1, rentalEnabled: 1, primaryCategory: 1 });
ProductSchema.index({ isActive: 1, availabilityMode: 1, primaryCategory: 1 });

// AI Visual Search Index
ProductSchema.index({ isActive: 1, aiTags: 1 }, { sparse: true });

// Sitemap Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

ProductSchema.post('save', () => {
  triggerSitemapUpdate();
});

ProductSchema.post('save', async function (doc) {
  try {
    if (!doc.deletedAt) {
      await indexProduct(doc);
    }
  } catch (err: any) {
    logger.error(`[Search Indexer] Failed to index product: ${err.message}`);
  }
});

ProductSchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && !doc.deletedAt) {
      await indexProduct(doc);
    }
  } catch (err: any) {
    logger.error(`[Search Indexer] Failed to index product on update: ${err.message}`);
  }
});

ProductSchema.plugin(SoftDeletePlugin);
ProductSchema.plugin(ForensicAuditPlugin);

const Product = mongoose.model<IProduct, SoftDeleteModel<IProduct>>('Product', ProductSchema);
export default Product;
