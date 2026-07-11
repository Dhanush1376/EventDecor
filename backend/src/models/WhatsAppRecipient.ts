import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppRecipient extends Document {
  name: string;
  phone: string;
  role: 'owner' | 'manager' | 'warehouse' | 'packing' | 'accounts' | 'driver' | 'custom';
  isActive: boolean;

  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };

  stats: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    lastMessageAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppRecipientSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ['owner', 'manager', 'warehouse', 'packing', 'accounts', 'driver', 'custom'],
      required: true,
    },
    isActive: { type: Boolean, default: true },

    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },

    stats: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      lastMessageAt: { type: Date },
    },
  },
  { timestamps: true },
);

WhatsAppRecipientSchema.index({ role: 1 });
WhatsAppRecipientSchema.index({ isActive: 1 });

const WhatsAppRecipient = mongoose.model<IWhatsAppRecipient>(
  'WhatsAppRecipient',
  WhatsAppRecipientSchema,
);
export default WhatsAppRecipient;
