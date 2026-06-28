import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  version: number;
  seoMetadata?: {
    title?: string;
    description?: string;
  };
  lastUpdatedBy?: mongoose.Types.ObjectId;
}

const PolicySchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    version: { type: Number, default: 1 },
    seoMetadata: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model<IPolicy>('Policy', PolicySchema);
