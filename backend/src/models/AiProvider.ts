import mongoose, { Schema, Document } from 'mongoose';
import { encryptField, decryptField } from '../utils/security/fieldEncryption';
import logger from '../config/logger';

export interface IAiProvider extends Document {
  name: string;
  provider: string; // 'openai' | 'gemini' | 'anthropic' | 'groq' | 'custom' | 'ollama' | 'azure_openai'
  apiKey: string;
  endpointUrl?: string;
  modelOverride?: string;
  isValidated: boolean;
  lastValidatedAt?: Date;
  autoDetectedModel?: string;
  capabilities: {
    vision: boolean;
    text: boolean;
    jsonMode: boolean;
    streaming: boolean;
    embeddings: boolean;
  };
  health: {
    status: string; // 'healthy' | 'degraded' | 'down' | 'unknown'
    lastSuccessAt?: Date;
    lastErrorAt?: Date;
    lastError?: string;
    avgLatencyMs: number;
    healthScore: number; // 0-100
  };
  enabled: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  getDecryptedApiKey(): string;
}

const AiProviderSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    provider: { type: String, required: true },
    apiKey: { type: String, required: true },
    endpointUrl: { type: String },
    modelOverride: { type: String },
    isValidated: { type: Boolean, default: false },
    lastValidatedAt: { type: Date },
    autoDetectedModel: { type: String },
    capabilities: {
      vision: { type: Boolean, default: false },
      text: { type: Boolean, default: true },
      jsonMode: { type: Boolean, default: false },
      streaming: { type: Boolean, default: false },
      embeddings: { type: Boolean, default: false },
    },
    health: {
      status: { type: String, default: 'unknown' },
      lastSuccessAt: { type: Date },
      lastErrorAt: { type: Date },
      lastError: { type: String },
      avgLatencyMs: { type: Number, default: 0 },
      healthScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    enabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

// Pre-save hook to encrypt the API key
AiProviderSchema.pre<IAiProvider>('save', async function () {
  if (this.isModified('apiKey') && this.apiKey) {
    if (
      this.apiKey !== '****' &&
      !this.apiKey.includes('*') &&
      !this.apiKey.startsWith('enc:v1:')
    ) {
      try {
        this.apiKey = encryptField(this.apiKey);
      } catch (err: any) {
        logger.error(`[AI_PROVIDER] Failed to encrypt API Key: ${err.message}`);
        throw err;
      }
    }
  }
});

// Helper method to get the decrypted API key
AiProviderSchema.methods.getDecryptedApiKey = function (): string {
  if (!this.apiKey) return '';
  if (this.apiKey === '****' || this.apiKey.includes('*')) return this.apiKey;
  if (!this.apiKey.startsWith('enc:v1:')) return this.apiKey;

  try {
    return decryptField(this.apiKey);
  } catch (err: any) {
    logger.error(`[AI_PROVIDER] Failed to decrypt API Key: ${err.message}`);
    return '';
  }
};

const AiProvider = mongoose.model<IAiProvider>('AiProvider', AiProviderSchema);
export default AiProvider;
