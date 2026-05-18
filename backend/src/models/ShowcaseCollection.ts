import mongoose, { Schema, Document } from 'mongoose';

export interface IShowcaseItem {
  name: string;
  defaultQty: number;
  condition: 'excellent' | 'good' | 'worn' | 'maintenance';
}

export interface IShowcaseCollection extends Document {
  title: string;
  subtitle: string;
  category: string; // e.g. 'engagement_gift', 'tambulam_showcase', 'coconut_decor', 'telugu_heritage'
  rentalPrice: number;
  description: string;
  image: string;
  gallery: string[];
  inclusions: IShowcaseItem[];
  colorPalette: string[];
  suggestedProps: string[];
  setupTimeHours: number;
  popularityScore: number;
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShowcaseItemSchema = new Schema({
  name: { type: String, required: true },
  defaultQty: { type: Number, default: 1 },
  condition: { type: String, enum: ['excellent', 'good', 'worn', 'maintenance'], default: 'excellent' }
});

const ShowcaseCollectionSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    category: { type: String, required: true },
    rentalPrice: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    gallery: [{ type: String }],
    inclusions: [ShowcaseItemSchema],
    colorPalette: [{ type: String }],
    suggestedProps: [{ type: String }],
    setupTimeHours: { type: Number, default: 2 },
    popularityScore: { type: Number, default: 0 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ShowcaseCollectionSchema.index({ title: 'text', description: 'text' });
ShowcaseCollectionSchema.index({ category: 1 });

const ShowcaseCollection = mongoose.model<IShowcaseCollection>('ShowcaseCollection', ShowcaseCollectionSchema);
export default ShowcaseCollection;
