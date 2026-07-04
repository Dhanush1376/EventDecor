import { Types } from 'mongoose';

export type TransactionDomain = 'purchase' | 'rental' | 'event' | 'custom';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REFUNDED' | 'FAILED';

export interface ITransaction {
  _id?: Types.ObjectId;
  transactionId: string;
  domain: TransactionDomain;
  referenceId: Types.ObjectId;
  customer: Types.ObjectId;
  canonicalStatus: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  domainMetadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}
