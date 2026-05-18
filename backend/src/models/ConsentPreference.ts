import mongoose, { Schema, Document } from 'mongoose';

export interface IConsentPreference extends Document {
  userId?: mongoose.Types.ObjectId;
  consentToken: string; // Unique token stored in visitor cookie / localStorage
  cookies: boolean;
  marketingEmails: boolean;
  updateNotifications: boolean;
  personalizedRecommendations: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentPreferenceSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    consentToken: { type: String, required: true, unique: true, index: true },
    cookies: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: false },
    updateNotifications: { type: Boolean, default: false },
    personalizedRecommendations: { type: Boolean, default: false },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

ConsentPreferenceSchema.index({ userId: 1 }, { sparse: true });
ConsentPreferenceSchema.index({ createdAt: -1 });

const ConsentPreference = mongoose.model<IConsentPreference>('ConsentPreference', ConsentPreferenceSchema);

export default ConsentPreference;
