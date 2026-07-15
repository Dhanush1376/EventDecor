import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IBlog extends ISoftDeleted {
  id: string; // for compatibility with legacy json
  slug: string;
  title: string;
  metaDescription: string;
  category: string;
  author: string;
  publishDate: Date;
  heroImage: string;
  heroImageAlt: string;
  tags: string[];
  content: {
    type: string;
    text?: string;
    src?: string;
    alt?: string;
  }[];
  relatedLinks: {
    text: string;
    url: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

const BlogSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    metaDescription: { type: String, required: true },
    category: { type: String, required: true },
    author: { type: String, required: true },
    publishDate: { type: Date, required: true },
    heroImage: { type: String, required: true },
    heroImageAlt: { type: String, required: true },
    tags: [{ type: String }],
    content: [
      {
        type: { type: String, required: true },
        text: { type: String },
        src: { type: String },
        alt: { type: String },
      },
    ],
    relatedLinks: [
      {
        text: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
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

BlogSchema.plugin(SoftDeletePlugin);

export default mongoose.model<IBlog, SoftDeleteModel<IBlog>>('Blog', BlogSchema);
