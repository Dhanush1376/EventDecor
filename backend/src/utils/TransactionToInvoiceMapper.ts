import { ITransaction } from '../types/transaction';
import Order from '../models/Order';
import RentalOrder from '../models/RentalOrder';
import EventJob from '../domains/event_operations/models/EventJob';
import CustomOrder from '../models/CustomOrder';
import { InvoiceService } from '../services/InvoiceService';
import { IInvoiceLineItem } from '../models/Invoice';
import logger from '../config/logger';

export class TransactionToInvoiceMapper {
  /**
   * Generates or syncs the invoice for a given transaction.
   * Pulls line items and tax breakdown from the underlying domain record.
   */
  public static async syncInvoice(transaction: ITransaction) {
    try {
      let lineItems: IInvoiceLineItem[] = [];
      let subtotal = 0;
      let tax = 0;
      let discount = 0;
      let shipping = 0;
      let totalAmount = transaction.totalAmount;

      switch (transaction.domain) {
        case 'purchase': {
          const order = await Order.findById(transaction.referenceId);
          if (order) {
            lineItems = order.items.map((item: any) => ({
              description: `${item.title} ${item.variant ? `(${item.variant})` : ''}`.trim(),
              quantity: item.quantity,
              unitPrice: item.price,
              total: item.price * item.quantity,
            }));
            subtotal = order.subtotal || 0;
            tax = 0; // Legacy order model didn't heavily separate tax, assuming 0 for now
            discount = order.discount || 0;
            shipping = order.shippingFee || 0;
            totalAmount = order.total || transaction.totalAmount;
          }
          break;
        }
        case 'rental': {
          const rental = await RentalOrder.findById(transaction.referenceId);
          if (rental) {
            lineItems = [
              {
                description: `Rental: ${rental.product} (${rental.durationDays} days)`,
                quantity: 1,
                unitPrice: rental.rentalCharge,
                total: rental.rentalCharge,
              },
              {
                description: 'Security Deposit (Refundable)',
                quantity: 1,
                unitPrice: rental.securityDeposit,
                total: rental.securityDeposit,
              },
            ];
            subtotal = rental.rentalCharge + rental.securityDeposit;
            tax = rental.tax || 0;
            shipping = rental.deliveryCharge || 0;
            totalAmount = rental.totalAmount || transaction.totalAmount;
          }
          break;
        }
        case 'event': {
          const event = await EventJob.findById(transaction.referenceId);
          if (event) {
            lineItems = [
              {
                description: `Event Booking: ${event.title}`,
                quantity: 1,
                unitPrice: event.pricing?.rentalFee || 0,
                total: event.pricing?.rentalFee || 0,
              },
            ];
            if (event.pricing?.setupCharges) {
              lineItems.push({
                description: 'Setup Charges',
                quantity: 1,
                unitPrice: event.pricing.setupCharges,
                total: event.pricing.setupCharges,
              });
            }
            if (event.pricing?.transportationCost) {
              shipping = event.pricing.transportationCost;
            }
            subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
            totalAmount = event.pricing?.totalPrice || transaction.totalAmount;
          }
          break;
        }
        case 'custom': {
          const custom = await CustomOrder.findById(transaction.referenceId);
          if (custom) {
            lineItems = [
              {
                description: `Custom Order: ${custom.productType || 'Bespoke Item'}`,
                quantity: custom.quantity || 1,
                unitPrice: custom.costEstimation?.total || 0,
                total: custom.costEstimation?.total || 0,
              },
            ];
            subtotal = custom.costEstimation?.total || 0;
            totalAmount = custom.costEstimation?.total || transaction.totalAmount;
          }
          break;
        }
      }

      const status = transaction.paymentStatus === 'COMPLETED' ? 'PAID' : 'ISSUED';

      await InvoiceService.generateInvoiceForTransaction(
        transaction._id!.toString(),
        lineItems,
        subtotal,
        tax,
        discount,
        shipping,
        totalAmount,
        status,
      );
    } catch (error) {
      logger.error(`Error mapping transaction to invoice: ${transaction._id}`, error);
    }
  }
}
