import mongoose, { Schema, Document } from 'mongoose';
import { ITransaction } from '../types/transaction';

/**
 * The lightweight cross-reference model for all commercial entities
 * (Purchases, Rentals, Events, Custom Orders).
 * This acts as the single source of truth for tracking, searching, and fulfilling
 * operations across disparate domain silos.
 */
const TransactionSchema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    domain: {
      type: String,
      enum: ['purchase', 'rental', 'event', 'custom'],
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    canonicalStatus: {
      type: String,
      required: true,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'COMPLETED', 'REFUNDED', 'FAILED'],
      default: 'PENDING',
    },
    domainMetadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const Transaction = mongoose.model<ITransaction & Document>(
  'Transaction',
  TransactionSchema,
);
export default Transaction;
