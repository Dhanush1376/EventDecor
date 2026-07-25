import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICatalogSynonym extends Document {
  valueId: Types.ObjectId; // References CatalogValue
  attributeSlug: string; // Denormalized for fast lookup
  term: string; // "golden", "gold finish", "pelli kobbari"
  termSlug: string; // "golden", "gold-finish", "pelli-kobbari"
  type: 'synonym' | 'seo_alias'; // synonym = normalization, seo_alias = search only
  language?: string; // "en", "te", "hi", "ta"
  createdAt: Date;
  updatedAt: Date;
}

const CatalogSynonymSchema: Schema = new Schema(
  {
    valueId: { type: Schema.Types.ObjectId, ref: 'CatalogValue', required: true },
    attributeSlug: { type: String, required: true },
    term: { type: String, required: true, trim: true },
    termSlug: { type: String, required: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ['synonym', 'seo_alias'],
      default: 'synonym',
    },
    language: { type: String, default: 'en' },
  },
  { timestamps: true },
);

// Indexes
CatalogSynonymSchema.index({ attributeSlug: 1, termSlug: 1 }, { unique: true });
CatalogSynonymSchema.index({ type: 1, term: 1 });
CatalogSynonymSchema.index({ valueId: 1 });

export default mongoose.model<ICatalogSynonym>('CatalogSynonym', CatalogSynonymSchema);
