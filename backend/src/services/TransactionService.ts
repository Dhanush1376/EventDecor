import { Types } from 'mongoose';
import { Transaction } from '../models/Transaction';
import { SequenceGeneratorService } from './SequenceGeneratorService';
import { StatusNormalizationService } from './StatusNormalizationService';
import { ITransaction, TransactionDomain, PaymentStatus } from '../types/transaction';
import logger from '../config/logger';
import { TransactionToInvoiceMapper } from '../utils/TransactionToInvoiceMapper';
import { TransactionToFulfilmentMapper } from '../utils/TransactionToFulfilmentMapper';
import { FulfilmentService } from './FulfilmentService';

export class TransactionService {
  /**
   * Idempotent method to sync a domain entity to the global Transaction index.
   * If the transaction already exists for the given referenceId and domain, it updates it.
   * If not, it creates a new canonical transaction record.
   */
  public static async syncTransaction(
    domain: TransactionDomain,
    referenceId: string | Types.ObjectId,
    customer: string | Types.ObjectId,
    legacyStatus: string,
    totalAmount: number,
    paymentStatus: PaymentStatus = 'PENDING',
    domainMetadata: Record<string, any> = {},
  ): Promise<ITransaction> {
    try {
      const canonicalStatus = StatusNormalizationService.normalizeStatus(legacyStatus, domain);

      // Check if it exists
      const existing = await Transaction.findOne({
        domain,
        referenceId: new Types.ObjectId(referenceId.toString()),
      });

      if (existing) {
        let statusChanged = false;
        if (existing.canonicalStatus !== canonicalStatus) {
          existing.canonicalStatus = canonicalStatus;
          statusChanged = true;
        }

        existing.totalAmount = totalAmount;
        existing.paymentStatus = paymentStatus;
        existing.domainMetadata = { ...existing.domainMetadata, ...domainMetadata };
        const savedTransaction = await existing.save();

        setImmediate(() => {
          TransactionToInvoiceMapper.syncInvoice(savedTransaction).catch((err) => {
            logger.error(
              `Failed to auto-sync invoice for existing transaction ${savedTransaction._id}`,
              err,
            );
          });

          if (savedTransaction.paymentStatus === 'COMPLETED') {
            FulfilmentService.initializeFulfilment(savedTransaction._id!.toString()).catch(
              (err) => {
                logger.error(
                  `Failed to initialize fulfilment for transaction ${savedTransaction._id}`,
                  err,
                );
              },
            );
          }

          if (statusChanged) {
            TransactionToFulfilmentMapper.syncTrackingEvent(savedTransaction).catch((err) => {
              logger.error(
                `Failed to sync tracking event for transaction ${savedTransaction._id}`,
                err,
              );
            });
          }
        });

        return savedTransaction;
      }

      // Generate sequence
      const transactionId = await SequenceGeneratorService.generateTransactionNumber();

      const newTransaction = new Transaction({
        transactionId,
        domain,
        referenceId: new Types.ObjectId(referenceId.toString()),
        customer: new Types.ObjectId(customer.toString()),
        canonicalStatus,
        totalAmount,
        paymentStatus,
        domainMetadata,
      });

      const savedTransaction = await newTransaction.save();

      // Auto-generate invoice and fulfilment
      setImmediate(() => {
        TransactionToInvoiceMapper.syncInvoice(savedTransaction).catch((err) => {
          logger.error(`Failed to auto-sync invoice for transaction ${savedTransaction._id}`, err);
        });

        // Initialize fulfilment if paid
        if (savedTransaction.paymentStatus === 'COMPLETED') {
          FulfilmentService.initializeFulfilment(savedTransaction._id!.toString()).catch((err) => {
            logger.error(
              `Failed to initialize fulfilment for transaction ${savedTransaction._id}`,
              err,
            );
          });
        }
      });

      return savedTransaction;
    } catch (error) {
      logger.error(`Error syncing transaction for ${domain} - ${referenceId}:`, error);
      throw error;
    }
  }

  /**
   * Used for the one-time idempotent backfill migration.
   */
  public static async getUnsyncedReferenceIds(
    domain: TransactionDomain,
    allReferenceIds: Types.ObjectId[],
  ): Promise<Types.ObjectId[]> {
    const synced = await Transaction.find(
      { domain, referenceId: { $in: allReferenceIds } },
      { referenceId: 1 },
    ).lean();
    const syncedIds = synced.map((t) => t.referenceId.toString());

    return allReferenceIds.filter((id) => !syncedIds.includes(id.toString()));
  }
}
