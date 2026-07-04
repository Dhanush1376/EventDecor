import { Types } from 'mongoose';
import { Invoice, IInvoiceLineItem } from '../models/Invoice';
import { Transaction } from '../models/Transaction';
import { SequenceGeneratorService } from './SequenceGeneratorService';
import logger from '../config/logger';

export class InvoiceService {
  /**
   * Generates or retrieves an invoice for a specific transaction.
   * If an invoice already exists for the transaction, it returns it.
   */
  public static async generateInvoiceForTransaction(
    transactionId: string | Types.ObjectId,
    lineItems: IInvoiceLineItem[],
    subtotal: number,
    tax: number,
    discount: number,
    shipping: number,
    totalAmount: number,
    status: 'DRAFT' | 'ISSUED' | 'PAID' = 'ISSUED',
  ) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      const existingInvoice = await Invoice.findOne({ transactionId: transaction._id });
      if (existingInvoice) {
        let changed = false;
        if (existingInvoice.status !== status) {
          existingInvoice.status = status;
          changed = true;
        }
        if (status === 'PAID' && !existingInvoice.paidAt) {
          existingInvoice.paidAt = new Date();
          changed = true;
        }
        if (changed) {
          await existingInvoice.save();
        }
        return existingInvoice;
      }

      const invoiceNumber = await SequenceGeneratorService.generateInvoiceNumber();

      const newInvoice = new Invoice({
        invoiceNumber,
        transactionId: transaction._id,
        customer: transaction.customer,
        domain: transaction.domain,
        lineItems,
        subtotal,
        tax,
        discount,
        shipping,
        totalAmount,
        status,
        issuedAt: status !== 'DRAFT' ? new Date() : undefined,
        paidAt: status === 'PAID' ? new Date() : undefined,
      });

      return await newInvoice.save();
    } catch (error) {
      logger.error(`Error generating invoice for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Updates an invoice status (e.g., when a payment goes through)
   */
  public static async markInvoicePaid(invoiceNumber: string) {
    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.status !== 'PAID') {
      invoice.status = 'PAID';
      invoice.paidAt = new Date();
      await invoice.save();
    }

    return invoice;
  }
}
