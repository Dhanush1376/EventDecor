import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISearchIndex extends Document {
  entityId: Types.ObjectId;
  entityType: 'Product' | 'Event' | 'Gallery';
  title: string;
  slug?: string;
  image?: string;
  price?: number;
  rating?: number;
  reviews?: number;

  // Search structures
  ngrams: string[];
  tokens: string[];
  synonymTokens: string[];
  categoryTokens: string[];
  tagTokens: string[];
  materialTokens: string[];
  descriptionTokens: string[];

  // Weights and ranking
  popularity: number;
  adminBoost: number;
  isPinned: boolean;
  isActive: boolean;
}

const SearchIndexSchema = new Schema<ISearchIndex>(
  {
    entityId: { type: Schema.Types.ObjectId, required: true, refPath: 'entityType' },
    entityType: { type: String, required: true, enum: ['Product', 'Event', 'Gallery'] },
    title: { type: String, required: true },
    slug: { type: String },
    image: { type: String },
    price: { type: Number },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },

    ngrams: [{ type: String }],
    tokens: [{ type: String }],
    synonymTokens: [{ type: String }],
    categoryTokens: [{ type: String }],
    tagTokens: [{ type: String }],
    materialTokens: [{ type: String }],
    descriptionTokens: [{ type: String }],

    popularity: { type: Number, default: 0 },
    adminBoost: { type: Number, default: 1 },
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

// Primary search index for prefix/substring via n-grams
SearchIndexSchema.index({ ngrams: 1 });

// Secondary lookup index for exact token matches
SearchIndexSchema.index({ tokens: 1 });
SearchIndexSchema.index({ synonymTokens: 1 });
SearchIndexSchema.index({ categoryTokens: 1 });
SearchIndexSchema.index({ tagTokens: 1 });

// Combine for specific filtering + searching
SearchIndexSchema.index({ entityType: 1, isActive: 1, popularity: -1 });
SearchIndexSchema.index({ entityId: 1 }, { unique: true });

export default mongoose.model<ISearchIndex>('SearchIndex', SearchIndexSchema);
