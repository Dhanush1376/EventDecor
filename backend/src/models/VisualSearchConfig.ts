import mongoose, { Schema, Document } from 'mongoose';
import { encryptField, decryptField } from '../utils/fieldEncryption';

export interface IVisualSearchProvider {
  name: string;
  apiKey: string;
  secretKey?: string;
  endpointUrl?: string;
  isValidated: boolean;
  lastValidatedAt?: Date;
  autoDetectedModel?: string;
}

export interface IVisualSearchConfig extends Document {
  // Feature controls
  enabled: boolean;
  cameraSearchEnabled: boolean;
  imageUploadEnabled: boolean;
  similarProductsEnabled: boolean;
  searchSensitivity: number;
  resultCount: number;
  similarityThreshold: number;

  // AI Provider configuration
  provider: IVisualSearchProvider;

  // Analytics controls
  analyticsEnabled: boolean;
  saveSearchedImages: boolean;

  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VisualSearchConfigSchema: Schema = new Schema(
  {
    // Feature controls
    enabled: { type: Boolean, default: false },
    cameraSearchEnabled: { type: Boolean, default: true },
    imageUploadEnabled: { type: Boolean, default: true },
    similarProductsEnabled: { type: Boolean, default: true },
    searchSensitivity: { type: Number, default: 0.7, min: 0, max: 1 },
    resultCount: { type: Number, default: 20, min: 1, max: 50 },
    similarityThreshold: { type: Number, default: 0.3, min: 0, max: 1 },

    // AI Provider configuration
    // CHANGED: Removed hardcoded enum to support any registered provider dynamically.
    // New providers can be added in providerRegistry.ts without schema migration.
    provider: {
      name: {
        type: String,
        default: 'groq',
      },
      apiKey: { type: String, default: '' },
      secretKey: { type: String, default: '' },
      endpointUrl: { type: String, default: '' },
      isValidated: { type: Boolean, default: false },
      lastValidatedAt: { type: Date },
      autoDetectedModel: { type: String, default: '' },
    },

    // Analytics controls
    analyticsEnabled: { type: Boolean, default: true },
    saveSearchedImages: { type: Boolean, default: false },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// ── Pre-save Hook: Encrypt API keys ────────────────────────────────────────
// Uses the existing fieldEncryption.ts utility (AES-256-GCM) that's already
// used for 2FA secrets in the same codebase. The encryptField function is
// idempotent — it won't re-encrypt an already-encrypted value (checks for
// the 'enc:v1:' prefix).

VisualSearchConfigSchema.pre('save', function () {
  const doc = this as any;
  try {
    if (
      doc.provider?.apiKey &&
      !doc.provider.apiKey.startsWith('enc:v1:') &&
      doc.provider.apiKey !== '****'
    ) {
      doc.provider.apiKey = encryptField(doc.provider.apiKey);
    }
    if (
      doc.provider?.secretKey &&
      !doc.provider.secretKey.startsWith('enc:v1:') &&
      doc.provider.secretKey !== '****'
    ) {
      doc.provider.secretKey = encryptField(doc.provider.secretKey);
    }
  } catch (err) {
    // If encryption fails (e.g., missing FIELD_ENCRYPTION_KEY), log but don't block save
    // This allows the system to work in development without encryption configured
    console.error('[VisualSearchConfig] Encryption failed:', (err as Error).message);
  }
});

// ── Helper: Decrypt API key for use ────────────────────────────────────────
// Call this when you need the actual API key value (for making API calls).
// The decryptField function is safe to call on unencrypted values — it passes
// them through unchanged if they don't start with 'enc:v1:'.

VisualSearchConfigSchema.methods.getDecryptedApiKey = function (): string {
  try {
    return decryptField(this.provider?.apiKey || '');
  } catch {
    return this.provider?.apiKey || '';
  }
};

VisualSearchConfigSchema.methods.getDecryptedSecretKey = function (): string {
  try {
    return decryptField(this.provider?.secretKey || '');
  } catch {
    return this.provider?.secretKey || '';
  }
};

const VisualSearchConfig = mongoose.model<IVisualSearchConfig>(
  'VisualSearchConfig',
  VisualSearchConfigSchema,
);
export default VisualSearchConfig;
