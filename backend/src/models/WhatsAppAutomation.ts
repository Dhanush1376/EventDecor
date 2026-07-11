import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppAutomation extends Document {
  automationKey: string;
  displayName: string;
  description: string;
  category: 'order' | 'payment' | 'inventory' | 'booking' | 'engagement' | 'system' | 'summary';
  enabled: boolean;

  recipientRoles: Array<{
    recipientId: mongoose.Types.ObjectId;
    enabled: boolean;
  }>;

  activeTemplateId?: mongoose.Types.ObjectId;

  sections: Array<{
    sectionKey: string;
    enabled: boolean;
    order: number;
    customHeading?: string;
    showIcon: boolean;
    showDivider: boolean;
  }>;

  conditions: Array<{
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'exists' | 'is_true';
    value: any;
    badge: string;
    emoji: string;
    enabled: boolean;
  }>;

  priority: 'critical' | 'high' | 'normal' | 'low';
  retryPolicy: {
    maxRetries: number;
    intervals: number[];
  };

  messageCount: number;
  mediaAttachments: {
    sendInvoice: boolean;
    sendShippingLabel: boolean;
    sendPackingSlip: boolean;
    sendQrCode: boolean;
    sendProductThumbnails: boolean;
  };

  escalation: {
    enabled: boolean;
    timeoutMinutes: number;
    escalateToRoles: string[];
    reminderMessage: string;
  };

  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppAutomationSchema = new Schema(
  {
    automationKey: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['order', 'payment', 'inventory', 'booking', 'engagement', 'system', 'summary'],
      required: true,
    },
    enabled: { type: Boolean, default: true },

    recipientRoles: [
      {
        recipientId: { type: Schema.Types.ObjectId, ref: 'WhatsAppRecipient' },
        enabled: { type: Boolean, default: true },
      },
    ],

    activeTemplateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },

    sections: [
      {
        sectionKey: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        order: { type: Number, required: true },
        customHeading: { type: String },
        showIcon: { type: Boolean, default: true },
        showDivider: { type: Boolean, default: true },
      },
    ],

    conditions: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: ['gt', 'lt', 'eq', 'gte', 'lte', 'contains', 'exists', 'is_true'],
          required: true,
        },
        value: { type: Schema.Types.Mixed },
        badge: { type: String, required: true },
        emoji: { type: String },
        enabled: { type: Boolean, default: true },
      },
    ],

    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },

    retryPolicy: {
      maxRetries: { type: Number, default: 4 },
      intervals: { type: [Number], default: [60, 300, 900, 1800] },
    },

    messageCount: { type: Number, default: 1 },

    mediaAttachments: {
      sendInvoice: { type: Boolean, default: false },
      sendShippingLabel: { type: Boolean, default: false },
      sendPackingSlip: { type: Boolean, default: false },
      sendQrCode: { type: Boolean, default: false },
      sendProductThumbnails: { type: Boolean, default: true },
    },

    escalation: {
      enabled: { type: Boolean, default: false },
      timeoutMinutes: { type: Number, default: 30 },
      escalateToRoles: [{ type: String }],
      reminderMessage: {
        type: String,
        default:
          '⏰ ORDER {{order_number}} has been pending for {{timeout}} minutes. Please process immediately.',
      },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

WhatsAppAutomationSchema.index({ category: 1, enabled: 1 });
WhatsAppAutomationSchema.index({ enabled: 1 });

const WhatsAppAutomation = mongoose.model<IWhatsAppAutomation>(
  'WhatsAppAutomation',
  WhatsAppAutomationSchema,
);
export default WhatsAppAutomation;
