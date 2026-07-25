import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICatalogValue extends Document {
  attributeSlug: string; // "color", "material", "size", "tag"
  value: string; // "Gold", "Emerald Green", "Wedding Decor"
  slug: string; // "gold", "emerald-green", "wedding-decor"

  // Hierarchy
  parentId?: Types.ObjectId; // Emerald Green -> parent is Green

  // Tag taxonomy (only for attributeSlug === "tag")
  taxonomy?: string; // "Occasion" | "Product Type" | "Theme" | "Material"

  // Approval & Confidence
  status: 'approved' | 'pending' | 'rejected';
  confidence: number; // 0-100: AI confidence when first suggested
  confidenceReasons: string[]; // e.g., ["Matched known material", "High image quality"]

  // Visibility
  isVisible: boolean; // true = storefront, false = AI-internal only

  // Popularity & Analytics
  usageCount: number;
  lastUsedAt?: Date;
  sortOrder: number; // Canonical display order within attribute type

  // Versioning
  version: number; // Incremented on each update

  // Audit
  createdBy: 'ai' | 'admin' | 'migration';
  approvedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const CatalogValueSchema: Schema = new Schema(
  {
    attributeSlug: { type: String, required: true, index: true },
    value: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },

    parentId: { type: Schema.Types.ObjectId, ref: 'CatalogValue', default: null },
    taxonomy: { type: String, default: null },

    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'pending',
    },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    confidenceReasons: [{ type: String }],

    isVisible: { type: Boolean, default: true },

    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    sortOrder: { type: Number, default: 0 },

    version: { type: Number, default: 1 },

    createdBy: {
      type: String,
      enum: ['ai', 'admin', 'migration'],
      default: 'admin',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

// Indexes
CatalogValueSchema.index({ attributeSlug: 1, slug: 1 }, { unique: true });
CatalogValueSchema.index({ attributeSlug: 1, status: 1, sortOrder: 1 });
CatalogValueSchema.index({ attributeSlug: 1, usageCount: -1 });
CatalogValueSchema.index({ parentId: 1 });
CatalogValueSchema.index({ attributeSlug: 1, taxonomy: 1 });

export default mongoose.model<ICatalogValue>('CatalogValue', CatalogValueSchema);
