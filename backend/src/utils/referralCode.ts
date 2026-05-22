import mongoose from 'mongoose';
import User from '../models/User';
import { LoyaltyService } from '../services/loyaltyService';
import logger from '../config/logger';

const DUPLICATE_KEY_CODE = 11000;
const MAX_REFERRAL_SAVE_ATTEMPTS = 3;

/** Persist a unique referral code with retry on MongoDB duplicate key (E11000). */
export const saveUniqueReferralCode = async (
  userId: mongoose.Types.ObjectId | string,
  name: string,
  session?: mongoose.ClientSession
): Promise<string> => {
  const existing = await User.findById(userId).select('referralCode').session(session || null);
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 1; attempt <= MAX_REFERRAL_SAVE_ATTEMPTS; attempt++) {
    const code = LoyaltyService.generateReferralCode(name);
    try {
      const updated = await User.findOneAndUpdate(
        { _id: userId, referralCode: { $exists: false } },
        { $set: { referralCode: code } },
        { new: true, session }
      );
      if (updated?.referralCode) return updated.referralCode;

      const raced = await User.findById(userId).select('referralCode').session(session || null);
      if (raced?.referralCode) return raced.referralCode;
    } catch (err: any) {
      if (err?.code === DUPLICATE_KEY_CODE && attempt < MAX_REFERRAL_SAVE_ATTEMPTS) {
        logger.warn(`[REFERRAL] Code collision on attempt ${attempt}, regenerating`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to assign unique referral code after retries');
};
