import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPreferenceProfile extends Document {
  userId: mongoose.Types.ObjectId;
  categoryAffinities: Map<string, number>;
  styleAffinities: Map<string, number>;
  pricePreference: string;
  tagAffinities: Map<string, number>;
  engagementScore: number;
  interactionCount: number;
  lastInteractionAt: Date;
  topCategories: string[];
  topStyles: string[];
  recentSearches: string[];
  purchaseHistory: {
    categories: string[];
    avgPrice: number;
    totalSpent: number;
    bookingCount: number;
  };
  profileVersion: number;
  lastRebuiltAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    categoryAffinities: {
      type: Map,
      of: Number,
      default: {},
    },
    styleAffinities: {
      type: Map,
      of: Number,
      default: {},
    },
    pricePreference: {
      type: String,
      enum: ['budget', 'mid', 'premium', 'luxury', 'unknown'],
      default: 'unknown',
    },
    tagAffinities: {
      type: Map,
      of: Number,
      default: {},
    },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    interactionCount: { type: Number, default: 0, min: 0 },
    lastInteractionAt: { type: Date },
    topCategories: [{ type: String }],
    topStyles: [{ type: String }],
    recentSearches: [{ type: String }],
    purchaseHistory: {
      categories: [{ type: String }],
      avgPrice: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      bookingCount: { type: Number, default: 0 },
    },
    profileVersion: { type: Number, default: 1 },
    lastRebuiltAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
// UserPreferenceProfileSchema.index({ userId: 1 }, { unique: true }); // Removed duplicate index
UserPreferenceProfileSchema.index({ lastRebuiltAt: 1 });
UserPreferenceProfileSchema.index({ engagementScore: -1 });

const UserPreferenceProfile = mongoose.model<IUserPreferenceProfile>(
  'UserPreferenceProfile',
  UserPreferenceProfileSchema
);
export default UserPreferenceProfile;
