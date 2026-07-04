import { Schema, Document } from 'mongoose';
import { TransactionService } from '../services/TransactionService';
import { TransactionDomain, PaymentStatus } from '../types/transaction';
import logger from '../config/logger';

export interface TransactionSyncOptions {
  domain: TransactionDomain;
  statusField?: string;
  totalField?: string;
  paymentStatusField?: string;
  customerField?: string;
}

export default function TransactionSyncPlugin(schema: Schema, options: TransactionSyncOptions) {
  const {
    domain,
    statusField = 'orderStatus',
    totalField = 'total',
    paymentStatusField = 'paymentStatus',
    customerField = 'user',
  } = options;

  schema.post('save', async function (doc: Document) {
    try {
      const data = doc as any;
      if (!data[customerField]) return; // Skip if no customer linked yet

      await TransactionService.syncTransaction(
        domain,
        data._id,
        data[customerField],
        data[statusField] || 'Pending',
        data[totalField] || 0,
        mapPaymentStatus(data[paymentStatusField]),
        {
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      );
    } catch (error) {
      logger.error(`[TransactionSyncPlugin] save hook error for ${domain}:`, error);
    }
  });

  schema.post('findOneAndUpdate', async function (doc: Document | null) {
    if (!doc) return;
    try {
      const data = doc as any;
      if (!data[customerField]) return;

      await TransactionService.syncTransaction(
        domain,
        data._id,
        data[customerField],
        data[statusField] || 'Pending',
        data[totalField] || 0,
        mapPaymentStatus(data[paymentStatusField]),
        {
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      );
    } catch (error) {
      logger.error(`[TransactionSyncPlugin] findOneAndUpdate hook error for ${domain}:`, error);
    }
  });
}

function mapPaymentStatus(status?: string): PaymentStatus {
  if (!status) return 'PENDING';
  const l = status.toLowerCase();
  if (['captured', 'paid', 'settled'].includes(l)) return 'COMPLETED';
  if (['failed', 'chargeback', 'disputed'].includes(l)) return 'FAILED';
  if (['refunded'].includes(l)) return 'REFUNDED';
  if (['partially_refunded', 'partial'].includes(l)) return 'PARTIAL';
  return 'PENDING';
}
