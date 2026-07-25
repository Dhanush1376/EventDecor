import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAiLearningLog extends Document {
  attributeSlug: string; // "color"
  originalValue: string; // "Golden"
  correctedValue: string; // "Gold"
  correctedValueId?: Types.ObjectId; // Reference to CatalogValue
  correctionCount: number; // Incremented on repeat corrections
  lastCorrectedAt: Date;
  lastCorrectedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AiLearningLogSchema: Schema = new Schema(
  {
    attributeSlug: { type: String, required: true, index: true },
    originalValue: { type: String, required: true, trim: true },
    correctedValue: { type: String, required: true, trim: true },
    correctedValueId: { type: Schema.Types.ObjectId, ref: 'CatalogValue' },
    correctionCount: { type: Number, default: 1 },
    lastCorrectedAt: { type: Date, default: Date.now },
    lastCorrectedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

// Unique compound index for upserting on repeat corrections
AiLearningLogSchema.index({ attributeSlug: 1, originalValue: 1 }, { unique: true });

export default mongoose.model<IAiLearningLog>('AiLearningLog', AiLearningLogSchema);
