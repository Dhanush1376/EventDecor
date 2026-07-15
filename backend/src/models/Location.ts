import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface ILocation extends ISoftDeleted {
  slug: string;
  city: string;
  title: string;
  metaDescription: string;
  h1: string;
  heroImage: string;
  content: string[];
  services: string[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

const LocationSchema: Schema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    title: { type: String, required: true },
    metaDescription: { type: String, required: true },
    h1: { type: String, required: true },
    heroImage: { type: String, required: true },
    content: [{ type: String }],
    services: [{ type: String }],
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

LocationSchema.plugin(SoftDeletePlugin);

export default mongoose.model<ILocation, SoftDeleteModel<ILocation>>('Location', LocationSchema);
