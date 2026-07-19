import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalAiSettings extends Document {
  selectedProviderId?: mongoose.Types.ObjectId;
  fallbackProviderIds: mongoose.Types.ObjectId[];
  temperature: number;
  maxTokens: number;
  requestTimeout: number;
  retryCount: number;
  autoSelectModel: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalAiSettingsSchema: Schema = new Schema(
  {
    selectedProviderId: { type: Schema.Types.ObjectId, ref: 'AiProvider' },
    fallbackProviderIds: [{ type: Schema.Types.ObjectId, ref: 'AiProvider' }],
    temperature: { type: Number, default: 0.2, min: 0, max: 2 },
    maxTokens: { type: Number, default: 4000, min: 1 },
    requestTimeout: { type: Number, default: 60000, min: 1000 },
    retryCount: { type: Number, default: 2, min: 0, max: 5 },
    autoSelectModel: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

const GlobalAiSettings = mongoose.model<IGlobalAiSettings>(
  'GlobalAiSettings',
  GlobalAiSettingsSchema,
);
export default GlobalAiSettings;
