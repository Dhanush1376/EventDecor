import mongoose, { Schema, Document } from 'mongoose';

export interface IContentRevision {
  previousData: any;
  modifiedAt: Date;
}

export interface IContentSection extends Document {
  sectionKey: string;
  data: any;
  status: 'draft' | 'published';
  revisionHistory: IContentRevision[];
  lastModified: Date;
}

const ContentSectionSchema: Schema = new Schema(
  {
    sectionKey: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    revisionHistory: [
      {
        previousData: { type: Schema.Types.Mixed },
        modifiedAt: { type: Date, default: Date.now },
      },
    ],
    lastModified: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ContentSectionSchema.index({ status: 1 });

const ContentSection = mongoose.model<IContentSection>('ContentSection', ContentSectionSchema);
export default ContentSection;
