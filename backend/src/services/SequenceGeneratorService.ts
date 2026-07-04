import Counter from '../models/Counter';
import mongoose from 'mongoose';
import logger from '../config/logger';

export class SequenceGeneratorService {
  /**
   * Generates a unique atomic sequence for a given key.
   * Format will be padded to 6 digits, e.g. 000124.
   */
  static async nextSequence(counterId: string): Promise<string> {
    const counter = await Counter.findByIdAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true },
    );
    return String(counter.seq).padStart(6, '0');
  }

  /**
   * Specifically generates an Invoice Number for a given year.
   * e.g., INV-2026-000124
   */
  static async generateInvoiceNumber(year?: number): Promise<string> {
    const targetYear = year || new Date().getFullYear();
    const counterId = `invoice_${targetYear}`;

    // First, check if we need to initialize the counter to avoid overlapping with any legacy data.
    // We do this lazily. In a clustered environment, multiple hits might try to initialize,
    // so we use an atomic upsert to ensure safety.
    const exists = await Counter.exists({ _id: counterId });
    if (!exists) {
      await this.initializeInvoiceCounter(targetYear);
    }

    const seqStr = await this.nextSequence(counterId);
    return `INV-${targetYear}-${seqStr}`;
  }

  /**
   * Generates a unique transaction number
   * e.g., TXN-2026-000001
   */
  static async generateTransactionNumber(year?: number): Promise<string> {
    const targetYear = year || new Date().getFullYear();
    const counterId = `transaction_${targetYear}`;
    const seqStr = await this.nextSequence(counterId);
    return `TXN-${targetYear}-${seqStr}`;
  }

  /**
   * Generates a unique fulfilment number
   * e.g., FUL-2026-000001
   */
  static async generateFulfilmentNumber(year?: number): Promise<string> {
    const targetYear = year || new Date().getFullYear();
    const counterId = `fulfilment_${targetYear}`;
    const seqStr = await this.nextSequence(counterId);
    return `FUL-${targetYear}-${seqStr}`;
  }

  /**
   * Initializes the invoice counter based on existing invoices to prevent overlap.
   */
  private static async initializeInvoiceCounter(year: number) {
    try {
      // Look for the highest sequence number in the given year across models that hold invoiceNumber
      const regex = new RegExp(`^INV-${year}-(\\d{6})$`);

      const Order = mongoose.model('Order');

      let maxSeq = 0;

      // Find orders with matching invoice number
      const orderDocs = await Order.find(
        { invoiceNumber: { $regex: regex } },
        { invoiceNumber: 1 },
      );
      for (const doc of orderDocs) {
        if (doc.invoiceNumber) {
          const match = doc.invoiceNumber.match(regex);
          if (match && match[1]) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        }
      }

      // We will set the initial sequence to maxSeq.
      // Upsert it atomically only if it hasn't been created yet.
      await Counter.updateOne(
        { _id: `invoice_${year}` },
        { $setOnInsert: { seq: maxSeq } },
        { upsert: true },
      );
      logger.info(`Initialized invoice sequence for ${year} at ${maxSeq}`);
    } catch (e) {
      logger.warn('Failed to dynamically initialize invoice sequence, defaulting to 0', e);
      await Counter.updateOne(
        { _id: `invoice_${year}` },
        { $setOnInsert: { seq: 0 } },
        { upsert: true },
      );
    }
  }
}
