import mongoose, { Schema, Document } from 'mongoose';
import { AssetLifecyclePlugin } from '../utils/AssetLifecyclePlugin';

export interface IWebsiteContent extends Document {
  key: string; // e.g. "homepage", "about", "seo", "contact"
  content: any; // Flexible JSON content
  status: 'published' | 'draft' | 'archived';
  lastUpdatedBy: mongoose.Types.ObjectId;
}

const WebsiteContentSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    content: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'published',
    },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

WebsiteContentSchema.plugin(AssetLifecyclePlugin);

const WebsiteContent = mongoose.model<IWebsiteContent>('WebsiteContent', WebsiteContentSchema);
export default WebsiteContent;
