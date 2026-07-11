import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppTemplate extends Document {
  name: string;
  automationKey: string;
  targetAudience: 'owner' | 'warehouse' | 'packing' | 'accounts' | 'driver' | 'all';
  layout: 'compact' | 'detailed' | 'luxury' | 'minimal';

  headerTemplate: string;
  bodyTemplate: string;
  footerTemplate: string;

  sectionTemplates: Map<string, string>;
  productItemTemplate: string;

  metaTemplateName: string;
  metaTemplateLanguage: string;
  templateCategory: 'utility' | 'session' | 'internal_preview';
  providerMapping: {
    metaComponentType: string;
    variables: string[];
  }[];

  isDefault: boolean;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    automationKey: { type: String, required: true },
    targetAudience: {
      type: String,
      enum: ['owner', 'warehouse', 'packing', 'accounts', 'driver', 'all'],
      default: 'all',
    },
    layout: {
      type: String,
      enum: ['compact', 'detailed', 'luxury', 'minimal'],
      default: 'detailed',
    },

    headerTemplate: { type: String, default: '' },
    bodyTemplate: { type: String, required: true },
    footerTemplate: { type: String, default: '' },

    sectionTemplates: { type: Map, of: String, default: {} },
    productItemTemplate: { type: String, default: '' },

    metaTemplateName: { type: String, default: '' },
    metaTemplateLanguage: { type: String, default: 'en_US' },
    templateCategory: {
      type: String,
      enum: ['utility', 'session', 'internal_preview'],
      default: 'session',
    },
    providerMapping: [
      {
        metaComponentType: { type: String, default: 'body' }, // header, body, button
        variables: [{ type: String }], // The keys from our TemplateEngine registry
      },
    ],

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

WhatsAppTemplateSchema.index({ automationKey: 1 });
WhatsAppTemplateSchema.index({ isActive: 1 });

const WhatsAppTemplate = mongoose.model<IWhatsAppTemplate>(
  'WhatsAppTemplate',
  WhatsAppTemplateSchema,
);
export default WhatsAppTemplate;
