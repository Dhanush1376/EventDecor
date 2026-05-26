import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  key: string;
  value: any;
  type: 'boolean' | 'string' | 'number' | 'json' | 'array';
  description?: string;
  isPublic: boolean;
  updatedBy?: mongoose.Types.ObjectId;
}

const AppConfigSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    type: {
      type: String,
      enum: ['boolean', 'string', 'number', 'json', 'array'],
      default: 'string',
    },
    description: { type: String },
    isPublic: { type: Boolean, default: false, index: true }, // Whether the frontend can fetch it anonymously
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// High-Performance Query for Frontend Bootstrap
// AppConfigSchema.index({ isPublic: 1 }); // Removed duplicate index

const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
export default AppConfig;
