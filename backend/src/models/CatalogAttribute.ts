import mongoose, { Schema, Document } from 'mongoose';

export interface ICatalogAttribute extends Document {
  name: string; // e.g., "Color", "Size", "Material", "Tag"
  slug: string; // e.g., "color", "size", "material", "tag"
  displayOrder: number; // e.g., Color=1, Material=2, Size=3
  isFilterable: boolean; // Whether this appears in storefront filters
  isRequired: boolean; // Whether products must have this
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogAttributeSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    isFilterable: { type: Boolean, default: true },
    isRequired: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<ICatalogAttribute>('CatalogAttribute', CatalogAttributeSchema);
