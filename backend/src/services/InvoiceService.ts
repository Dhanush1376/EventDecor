import { SequenceGeneratorService } from './SequenceGeneratorService';
import storeSettingsService from './StoreSettingsService';
import logger from '../config/logger';
import type { IOrderInvoice, IOrderStoreSnapshot, IOrderTaxSnapshot } from '../types/invoice';
import { TaxEngine, type TaxCalculationResult } from './taxes/TaxEngine';

/**
 * Enterprise InvoiceService
 *
 * Responsible for generating immutable invoice snapshots that are embedded
 * directly into Order documents at checkout time.
 *
 * CRITICAL DESIGN PRINCIPLE:
 * This service receives precomputed tax results from TaxEngine. It creates
 * a self-contained, immutable legal snapshot that can reproduce the invoice
 * at any time without consulting current live store settings.
 */
export class InvoiceService {
  /**
   * Generates the complete set of immutable snapshots for an order.
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
    taxData?:
      | Partial<TaxCalculationResult>
      | {
          gstEnabled?: boolean;
          taxRate?: number;
          cgstRate?: number;
          sgstRate?: number;
          taxInclusive?: boolean;
        },
    invoicingMeta?: {
      hsnCode?: string;
      invoicePrefix?: string;
      invoiceFooter?: string;
    },
  ): Promise<{
    invoice: IOrderInvoice;
    store: IOrderStoreSnapshot;
    tax: IOrderTaxSnapshot;
  }> {
    const now = new Date();
    const settings = await storeSettingsService.getSettings();

    // 1. Generate sequential invoice number using configured prefix
    const prefix = invoicingMeta?.invoicePrefix || settings?.taxes?.invoicePrefix || 'INV-';
    const invoiceNumber = await SequenceGeneratorService.generateInvoiceNumber(prefix);

    // 2. Capture current store identity
    const store = this.captureStoreSnapshot(settings);

    // 3. Capture self-contained tax snapshot directly from TaxEngine result
    const tax = this.captureTaxSnapshot(orderTotals, taxData, settings, invoicingMeta);

    // 4. Build invoice metadata
    const invoice: IOrderInvoice = {
      number: invoiceNumber,
      issuedAt: now,
      generatedAt: now,
    };

    logger.info(`Generated immutable invoice snapshot ${invoiceNumber}`);

    return { invoice, store, tax };
  }

  /**
   * Captures the store's identity at this exact moment in time.
   */
  private static captureStoreSnapshot(settings: any): IOrderStoreSnapshot {
    return {
      displayName: settings?.general?.storeName || '',
      legalCompanyName: settings?.legal?.legalCompanyName || settings?.legal?.companyName || '',
      logo: settings?.general?.logo || '',
      gstin: settings?.taxes?.gstNumber || '',
      cin: settings?.legal?.cin || '',
      registeredAddress: settings?.legal?.registeredAddress || '',
      addressLine1: settings?.contact?.addressLine1 || settings?.contact?.address || '',
      addressLine2: settings?.contact?.addressLine2 || '',
      city: settings?.contact?.city || '',
      state: settings?.contact?.state || '',
      country: settings?.contact?.country || 'India',
      postalCode: settings?.contact?.postalCode || '',
      email: settings?.general?.supportEmail || settings?.contact?.email || '',
      phone: settings?.contact?.phone || '',
    };
  }

  /**
   * Captures the exact tax breakdown into a self-contained snapshot.
   */
  private static captureTaxSnapshot(
    orderTotals: {
      subtotal: number;
      discount: number;
      total: number;
    },
    taxData: any,
    settings: any,
    invoicingMeta?: {
      hsnCode?: string;
      invoiceFooter?: string;
    },
  ): IOrderTaxSnapshot {
    const { subtotal, discount, total } = orderTotals;

    // Check if taxData is already a TaxCalculationResult from TaxEngine
    if (
      taxData &&
      typeof taxData.taxAmount === 'number' &&
      typeof taxData.taxableAmount === 'number'
    ) {
      const res = taxData as TaxCalculationResult;
      return {
        subtotal,
        discount,
        taxableAmount: res.taxableAmount,
        totalTax: res.taxAmount,
        taxAmount: res.taxAmount,
        cgst: res.cgst,
        sgst: res.sgst,
        igst: res.igst,
        grandTotal: total,
        gstEnabled: res.gstEnabled,
        taxInclusive: res.taxInclusive,
        gstRate: res.gstRate,
        cgstRate: res.cgstRate,
        sgstRate: res.sgstRate,
        isInterState: res.isInterState,
        hsnCode: invoicingMeta?.hsnCode || settings?.taxes?.hsnCode || '',
        invoiceFooter: invoicingMeta?.invoiceFooter || settings?.taxes?.invoiceFooter || '',
        currency: 'INR',
        currencySymbol: '₹',
      };
    }

    // Fallback: derive using TaxEngine with store/customer context
    const fallbackResult = TaxEngine.calculateTax({
      subtotal,
      discount,
      storeState: settings?.contact?.state || 'AP',
      customerState: settings?.contact?.state || 'AP',
      taxConfig: {
        gstEnabled: taxData?.gstEnabled ?? settings?.taxes?.gstEnabled ?? true,
        taxInclusive: taxData?.taxInclusive ?? settings?.taxes?.taxInclusive ?? true,
        gstRate: taxData?.gstRate ?? taxData?.taxRate ?? settings?.taxes?.gstRate ?? 0.18,
        cgstRate: taxData?.cgstRate ?? settings?.taxes?.cgstRate ?? 0.09,
        sgstRate: taxData?.sgstRate ?? settings?.taxes?.sgstRate ?? 0.09,
      },
    });

    return {
      subtotal,
      discount,
      taxableAmount: fallbackResult.taxableAmount,
      totalTax: fallbackResult.taxAmount,
      taxAmount: fallbackResult.taxAmount,
      cgst: fallbackResult.cgst,
      sgst: fallbackResult.sgst,
      igst: fallbackResult.igst,
      grandTotal: total,
      gstEnabled: fallbackResult.gstEnabled,
      taxInclusive: fallbackResult.taxInclusive,
      gstRate: fallbackResult.gstRate,
      cgstRate: fallbackResult.cgstRate,
      sgstRate: fallbackResult.sgstRate,
      isInterState: fallbackResult.isInterState,
      hsnCode: invoicingMeta?.hsnCode || settings?.taxes?.hsnCode || '',
      invoiceFooter: invoicingMeta?.invoiceFooter || settings?.taxes?.invoiceFooter || '',
      currency: 'INR',
      currencySymbol: '₹',
    };
  }
}
