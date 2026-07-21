import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import { AssetLifecyclePlugin } from '../utils/AssetLifecyclePlugin';

export interface ICategory extends ISoftDeleted {
  name: string;
  slug: string;
  type: 'product' | 'event' | 'gallery' | 'global';
  description?: string;
  icon?: string;
  imageSrc?: string;
  parentCategory?: mongoose.Types.ObjectId;
  coverProduct?: mongoose.Types.ObjectId;
  displayOrder: number;
  isActive: boolean;
  metadata?: any;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['product', 'event', 'gallery', 'global'],
      default: 'global',
      index: true,
    },
    description: { type: String },
    icon: { type: String },
    imageSrc: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    coverProduct: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    metadata: { type: Schema.Types.Mixed }, // Additional dynamic tags/configs
  },
  { timestamps: true },
);

// Indexes for common frontend queries
CategorySchema.index({ type: 1, isActive: 1, displayOrder: 1 });
CategorySchema.index(
  { name: 'text', description: 'text' },
  { name: 'CategoryTextIndex', weights: { name: 10, description: 2 } },
);

CategorySchema.plugin(SoftDeletePlugin);
CategorySchema.plugin(AssetLifecyclePlugin, {
  tier: 3,
  assetFields: [{ path: 'imageSrc', type: 'single', resourceType: 'image' }],
});

const Category = mongoose.model<ICategory, SoftDeleteModel<ICategory>>('Category', CategorySchema);
export default Category;
