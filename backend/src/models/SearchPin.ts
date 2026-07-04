import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISearchPin extends Document {
  keyword: string;
  pinnedProductIds: Types.ObjectId[];
  boostScore: number;
  isActive: boolean;
  createdBy?: Types.ObjectId;
}

const SearchPinSchema = new Schema<ISearchPin>(
  {
    keyword: { type: String, required: true, lowercase: true, trim: true, unique: true },
    pinnedProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    boostScore: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

SearchPinSchema.index({ keyword: 1 });
SearchPinSchema.index({ isActive: 1 });

export default mongoose.model<ISearchPin>('SearchPin', SearchPinSchema);
