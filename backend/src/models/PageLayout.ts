import mongoose, { Schema, Document } from 'mongoose';

export interface ISectionConfig {
  componentName: string; // e.g., 'HeroBanner', 'TrendingSection', 'SeasonalHighlights'
  props: any; // Dynamic data passed to the component
  order: number;
  isActive: boolean;
}

export interface IPageLayout extends Document {
  pagePath: string; // e.g., '/', '/collections', '/events'
  name: string;
  sections: ISectionConfig[];
  status: 'draft' | 'published';
  updatedBy?: mongoose.Types.ObjectId;
}

const SectionConfigSchema = new Schema(
  {
    componentName: { type: String, required: true },
    props: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const PageLayoutSchema: Schema = new Schema(
  {
    pagePath: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    sections: { type: [SectionConfigSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const PageLayout = mongoose.model<IPageLayout>('PageLayout', PageLayoutSchema);
export default PageLayout;
