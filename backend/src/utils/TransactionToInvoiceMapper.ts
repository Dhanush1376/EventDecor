import { ITransaction } from '../types/transaction';
import Order from '../models/Order';
import RentalOrder from '../models/RentalOrder';
import EventJob from '../domains/event_operations/models/EventJob';
import CustomOrder from '../models/CustomOrder';

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
      let _subtotal = 0;
      let _tax = 0;
      let _discount = 0;
      let _shipping = 0;
      let _totalAmount = transaction.totalAmount;

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
            _subtotal = order.subtotal || 0;
            _tax = 0; // Legacy order model didn't heavily separate tax, assuming 0 for now
            _discount = order.discount || 0;
            _shipping = order.shippingFee || 0;
            _totalAmount = order.total || transaction.totalAmount;
          }
          break;
        }
        case 'rental': {
          const rental = await RentalOrder.findById(transaction.referenceId);
          if (rental) {
            lineItems = [
              {
                description: `Rental: ${rental.productTitle || rental.product} (${rental.durationDays} days)`,
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
            _subtotal = rental.rentalCharge + rental.securityDeposit;
            _tax = rental.tax || 0;
            _shipping = rental.deliveryCharge || 0;
            _totalAmount = rental.totalAmount || transaction.totalAmount;
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
              _shipping = event.pricing.transportationCost;
            }
            _subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
            _totalAmount = event.pricing?.totalPrice || transaction.totalAmount;
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
            _subtotal = custom.costEstimation?.total || 0;
            _totalAmount = custom.costEstimation?.total || transaction.totalAmount;
          }
          break;
        }
      }

      // const status = transaction.paymentStatus === 'COMPLETED' ? 'PAID' : 'ISSUED';

      // Obsolete: Standalone invoice document generation is replaced by
      // immutable invoice snapshots embedded directly in the Order document.
      // await InvoiceService.generateInvoiceForTransaction(
      //   transaction._id!.toString(),
      //   lineItems,
      //   subtotal,
      //   tax,
      //   discount,
      //   shipping,
      //   totalAmount,
      //   status,
      // );
    } catch (error) {
      logger.error(`Error mapping transaction to invoice: ${transaction._id}`, error);
    }
  }
}
