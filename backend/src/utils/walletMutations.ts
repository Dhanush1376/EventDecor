import mongoose, { ClientSession } from 'mongoose';
import User from '../models/User';
import ApiError from './ApiError';

/** Atomic wallet debit — returns updated user or null if insufficient balance. */
export const debitWalletBalance = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  return User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true, session }
  );
};

/** Atomic wallet credit. */
export const creditWalletBalance = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  return User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true, session });
};

/** Atomic siriCoins credit. */
export const creditSiriCoins = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  return User.findByIdAndUpdate(userId, { $inc: { siriCoins: amount } }, { new: true, session });
};

/** Atomic siriCoins debit — throws if balance would go negative. */
export const debitSiriCoins = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  const updated = await User.findOneAndUpdate(
    { _id: userId, siriCoins: { $gte: amount } },
    { $inc: { siriCoins: -amount } },
    { new: true, session }
  );
  if (!updated) {
    throw new ApiError(400, 'Insufficient Siri Coins balance');
  }
  return updated;
};
