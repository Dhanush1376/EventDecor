import { SequenceGeneratorService } from './SequenceGeneratorService';
import storeSettingsService from './StoreSettingsService';
import logger from '../config/logger';
import type { IOrderInvoice, IOrderStoreSnapshot, IOrderTaxSnapshot } from '../types/invoice';

/**
 * Enterprise InvoiceService
 *
 * Responsible for generating immutable invoice snapshots that are embedded
 * directly into Order documents at checkout time.
 *
 * CRITICAL DESIGN PRINCIPLE:
 * This service NEVER calculates financial values. It only COPIES values
 * that were already computed by the checkout pipeline. The tax breakdown
 * is derived from the exact totals that the customer was charged.
 */
export class InvoiceService {
  /**
   * Generates the complete set of immutable snapshots for an order.
   *
   * Called once at checkout. The returned objects are stored directly
   * on the Order document and must never be modified afterwards.
   *
   * @param orderTotals - The exact financial values computed by the checkout
   * @param taxConfig   - The tax configuration active at checkout time
   */
  public static async generateOrderSnapshots(
    orderTotals: {
      subtotal: number;
      discount: number;
      shippingFee: number;
      codFee: number;
      walletDeduction: number;
      total: number;
    },
    taxConfig?: {
      gstEnabled: boolean;
      taxRate: number;
      cgstRate: number;
      sgstRate: number;
      taxInclusive: boolean;
    },
  ): Promise<{
    invoice: IOrderInvoice;
    store: IOrderStoreSnapshot;
    tax: IOrderTaxSnapshot;
  }> {
    const now = new Date();

    // 1. Generate sequential invoice number (atomic, never collides)
    const invoiceNumber = await SequenceGeneratorService.generateInvoiceNumber();

    // 2. Capture current store identity
    const settings = await storeSettingsService.getSettings();
    const store = this.captureStoreSnapshot(settings);

    // 3. Capture tax breakdown from the EXACT totals (no recalculation)
    const effectiveTaxConfig = taxConfig || {
      gstEnabled: settings.taxes.gstEnabled,
      taxRate: settings.taxes.gstRate,
      cgstRate: settings.taxes.cgstRate,
      sgstRate: settings.taxes.sgstRate,
      taxInclusive: settings.taxes.taxInclusive,
    };
    const tax = this.captureTaxSnapshot(orderTotals, effectiveTaxConfig);

    // 4. Build invoice metadata
    const invoice: IOrderInvoice = {
      number: invoiceNumber,
      issuedAt: now,
      generatedAt: now,
    };

    logger.info(`Generated invoice snapshot ${invoiceNumber}`);

    return { invoice, store, tax };
  }

  /**
   * Captures the store's identity at this exact moment in time.
   * If the business rebrands or moves, old invoices retain the original data.
   */
  private static captureStoreSnapshot(settings: any): IOrderStoreSnapshot {
    return {
      displayName: settings.general.storeName || '',
      legalCompanyName: settings.legal.legalCompanyName || settings.legal.companyName || '',
      logo: settings.general.logo || '',
      gstin: settings.taxes.gstNumber || '',
      cin: settings.legal.cin || '',
      registeredAddress: settings.legal.registeredAddress || '',
      addressLine1: settings.contact.addressLine1 || settings.contact.address || '',
      addressLine2: settings.contact.addressLine2 || '',
      city: settings.contact.city || '',
      state: settings.contact.state || '',
      country: settings.contact.country || 'India',
      postalCode: settings.contact.postalCode || '',
      email: settings.general.supportEmail || settings.contact.email || '',
      phone: settings.contact.phone || '',
    };
  }

  /**
   * Captures the exact tax breakdown from already-computed order totals.
   *
   * IMPORTANT: This method does NOT "calculate" tax. It derives the tax
   * components from the total that the customer was already charged.
   * This ensures the snapshot is a faithful copy of the checkout math.
   */
  private static captureTaxSnapshot(
    totals: {
      subtotal: number;
      discount: number;
      total: number;
    },
    taxConfig: {
      gstEnabled: boolean;
      taxRate: number;
      cgstRate: number;
      sgstRate: number;
      taxInclusive: boolean;
    },
  ): IOrderTaxSnapshot {
    const { subtotal, discount, total } = totals;
    const { gstEnabled, taxRate, cgstRate, sgstRate, taxInclusive } = taxConfig;

    let taxableAmount: number;
    let totalTax: number;

    if (!gstEnabled) {
      taxableAmount = total;
      totalTax = 0;
    } else if (taxInclusive) {
      // Tax is already included in the total — extract it
      taxableAmount = parseFloat((total / (1 + taxRate)).toFixed(2));
      totalTax = parseFloat((total - taxableAmount).toFixed(2));
    } else {
      // Tax is on top of subtotal minus discount
      taxableAmount = subtotal - discount;
      totalTax = parseFloat((taxableAmount * taxRate).toFixed(2));
    }

    // Split tax into CGST and SGST (intra-state)
    // For inter-state, IGST would be the full amount and CGST/SGST would be 0
    const cgstRatio = cgstRate / (taxRate || 1);
    const sgstRatio = sgstRate / (taxRate || 1);

    const cgst = parseFloat((totalTax * cgstRatio).toFixed(2));
    const sgst = parseFloat((totalTax * sgstRatio).toFixed(2));
    const igst = 0; // Intra-state by default; inter-state support can be added later

    return {
      subtotal,
      discount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal: total,
      currency: 'INR',
      currencySymbol: '₹',
    };
  }
}
