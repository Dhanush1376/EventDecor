import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISearchSynonym extends Document {
  groupName: string;
  terms: string[];
  language: string;
  category: 'synonym' | 'transliteration' | 'alias' | 'redirect' | 'boost';
  isActive: boolean;
  createdBy?: Types.ObjectId;
}

const SearchSynonymSchema = new Schema<ISearchSynonym>(
  {
    groupName: { type: String, required: true, unique: true },
    terms: [{ type: String, lowercase: true, trim: true }],
    language: { type: String, default: 'mixed' },
    category: {
      type: String,
      enum: ['synonym', 'transliteration', 'alias', 'redirect', 'boost'],
      default: 'synonym',
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

SearchSynonymSchema.index({ terms: 1 });
SearchSynonymSchema.index({ isActive: 1, category: 1 });

export default mongoose.model<ISearchSynonym>('SearchSynonym', SearchSynonymSchema);
