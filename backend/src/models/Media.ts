import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted } from '../utils/SoftDeletePlugin';

export interface IMedia extends ISoftDeleted {
  // === Core Identity ===
  publicId: string;
  secureUrl: string;
  resourceType: 'image' | 'video' | 'raw';
  folder: string;

  // === Dimensions & Size ===
  width: number;
  height: number;
  bytes: number;
  format: string;
  originalFilename: string;

  // === Duplicate Detection ===
  hash: string;

  // === Tagging & Metadata ===
  tags: string[];
  thumbnails: { width: number; height: number; url: string }[];
  dominantColor?: string;
  metadata: Record<string, any>;

  // === Video-Specific ===
  duration?: number;
  codec?: string;
  posterUrl?: string;

  // === Reference Counting ===
  referenceCount: number;
  referencedBy: {
    model: string;
    field: string;
    documentId: mongoose.Types.ObjectId;
  }[];

  // === Versioning ===
  version: number;
  previousVersions: {
    publicId: string;
    secureUrl: string;
    bytes: number;
    format: string;
    replacedAt: Date;
    replacedBy?: mongoose.Types.ObjectId;
  }[];

  // === Lifecycle ===
  status: 'active' | 'pending_delete' | 'processing';
  uploadedBy?: mongoose.Types.ObjectId;

  // === Performance Tracking ===
  originalBytes?: number;
  optimizationSavings?: number;

  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema: Schema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'video', 'raw'], required: true },
    folder: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    format: { type: String, required: true },
    originalFilename: { type: String, required: true },
    hash: { type: String, index: true },
    tags: [{ type: String }],
    thumbnails: [
      {
        width: { type: Number },
        height: { type: Number },
        url: { type: String },
      },
    ],
    dominantColor: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    duration: { type: Number },
    codec: { type: String },
    posterUrl: { type: String },
    referenceCount: { type: Number, default: 0 },
    referencedBy: [
      {
        model: { type: String, required: true },
        field: { type: String, required: true },
        documentId: { type: Schema.Types.ObjectId, required: true },
      },
    ],
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        publicId: { type: String },
        secureUrl: { type: String },
        bytes: { type: Number },
        format: { type: String },
        replacedAt: { type: Date },
        replacedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'pending_delete', 'processing'],
      default: 'active',
      index: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    originalBytes: { type: Number },
    optimizationSavings: { type: Number },
  },
  { timestamps: true },
);

MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ resourceType: 1, createdAt: -1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ 'referencedBy.model': 1, 'referencedBy.documentId': 1 });
MediaSchema.index({ secureUrl: 1 });
MediaSchema.index({ referenceCount: 1, status: 1 });
MediaSchema.index({ originalFilename: 'text', tags: 'text' });

MediaSchema.plugin(SoftDeletePlugin, { retentionDays: 30 });

export default mongoose.model<IMedia>('Media', MediaSchema);
