import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppProviderConfig extends Document {
  providerName: string;
  isEnabled: boolean;
  priority: number;

  circuitBreaker: {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxAttempts: number;
  };

  rateLimits: {
    maxPerSecond: number;
    maxPerMonth?: number;
  };

  costPerMessage: number;
  currency: string;
  countryCode: string;

  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppProviderConfigSchema = new Schema(
  {
    providerName: {
      type: String,
      required: true,
      unique: true,
      enum: ['meta_cloud', 'twilio', 'gupshup', 'messagebird'],
    },
    isEnabled: { type: Boolean, default: true },
    priority: { type: Number, default: 1 }, // Lower is higher priority

    circuitBreaker: {
      failureThreshold: { type: Number, default: 3 }, // Failures before opening circuit
      resetTimeoutMs: { type: Number, default: 60000 }, // Time before trying again (HALF_OPEN)
      halfOpenMaxAttempts: { type: Number, default: 1 },
    },

    rateLimits: {
      maxPerSecond: { type: Number, default: 80 },
      maxPerMonth: { type: Number },
    },

    costPerMessage: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    countryCode: { type: String, default: 'IN' },
  },
  { timestamps: true },
);

const WhatsAppProviderConfig = mongoose.model<IWhatsAppProviderConfig>(
  'WhatsAppProviderConfig',
  WhatsAppProviderConfigSchema,
);

export default WhatsAppProviderConfig;
