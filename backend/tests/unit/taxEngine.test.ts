import { describe, it, expect, vi } from 'vitest';
import { TaxEngine } from '../../src/services/taxes/TaxEngine';
import { canonicalizeState } from '../../src/utils/stateCanonicalizer';
import { computeOrderTotals } from '../../src/services/orders/orderTotals';
import { InvoiceService } from '../../src/services/InvoiceService';
import storeSettingsService from '../../src/services/StoreSettingsService';
import { SequenceGeneratorService } from '../../src/services/SequenceGeneratorService';
import { ApiError } from '../../src/utils/ApiError';

describe('State Canonicalizer', () => {
  it('correctly canonicalizes standard 2-letter Indian state codes', () => {
    expect(canonicalizeState('AP')).toBe('AP');
    expect(canonicalizeState('ts')).toBe('TS');
    expect(canonicalizeState('mh')).toBe('MH');
    expect(canonicalizeState('DL')).toBe('DL');
    expect(canonicalizeState('ka')).toBe('KA');
  });

  it('correctly canonicalizes full Indian state and UT names', () => {
    expect(canonicalizeState('Andhra Pradesh')).toBe('AP');
    expect(canonicalizeState('telangana')).toBe('TS');
    expect(canonicalizeState('MAHARASHTRA')).toBe('MH');
    expect(canonicalizeState('Tamil Nadu')).toBe('TN');
    expect(canonicalizeState('Karnataka')).toBe('KA');
    expect(canonicalizeState('Jammu & Kashmir')).toBe('JK');
    expect(canonicalizeState('Jammu and Kashmir')).toBe('JK');
    expect(canonicalizeState('Delhi')).toBe('DL');
    expect(canonicalizeState('National Capital Territory of Delhi')).toBe('DL');
  });

  it('returns null for unrecognized or foreign states', () => {
    expect(canonicalizeState('California')).toBeNull();
    expect(canonicalizeState('Unknown Province')).toBeNull();
    expect(canonicalizeState('')).toBeNull();
    expect(canonicalizeState(null as any)).toBeNull();
  });
});

describe('TaxEngine - Unit Calculations', () => {
  const defaultTaxSettings = {
    gstEnabled: true,
    taxInclusive: true,
    gstRate: 0.18,
    cgstRate: 0.09,
    sgstRate: 0.09,
  };

  it('throws ApiError(400) when customer state is missing or invalid', () => {
    expect(() =>
      TaxEngine.calculateTax({
        subtotal: 1000,
        discount: 0,
        taxSettings: defaultTaxSettings,
        customerState: '',
        storeState: 'AP',
      }),
    ).toThrow(ApiError);

    expect(() =>
      TaxEngine.calculateTax({
        subtotal: 1000,
        discount: 0,
        taxSettings: defaultTaxSettings,
        customerState: 'California',
        storeState: 'AP',
      }),
    ).toThrow(ApiError);
  });

  it('calculates zero tax when GST is disabled', () => {
    const result = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 100,
      taxSettings: { ...defaultTaxSettings, gstEnabled: false },
      customerState: 'AP',
      storeState: 'AP',
    });

    expect(result.isGstEnabled).toBe(false);
    expect(result.taxableBase).toBe(900);
    expect(result.taxableAmount).toBe(900);
    expect(result.taxAmount).toBe(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
  });

  it('calculates intra-state GST (tax inclusive: subtotal ₹1180, 18% GST)', () => {
    const result = TaxEngine.calculateTax({
      subtotal: 1180,
      discount: 0,
      taxSettings: { ...defaultTaxSettings, taxInclusive: true },
      customerState: 'Andhra Pradesh',
      storeState: 'AP',
    });

    expect(result.isGstEnabled).toBe(true);
    expect(result.isTaxInclusive).toBe(true);
    expect(result.isInterState).toBe(false);
    expect(result.taxableBase).toBe(1180);
    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.cgst + result.sgst).toBe(result.taxAmount);
  });

  it('calculates intra-state GST (tax exclusive: subtotal ₹1000, 18% GST)', () => {
    const result = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 0,
      taxSettings: { ...defaultTaxSettings, taxInclusive: false },
      customerState: 'AP',
      storeState: 'AP',
    });

    expect(result.isGstEnabled).toBe(true);
    expect(result.isTaxInclusive).toBe(false);
    expect(result.isInterState).toBe(false);
    expect(result.taxableBase).toBe(1000);
    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.cgst + result.sgst).toBe(result.taxAmount);
  });

  it('calculates inter-state GST (tax inclusive: subtotal ₹1180, customer in MH, store in AP)', () => {
    const result = TaxEngine.calculateTax({
      subtotal: 1180,
      discount: 0,
      taxSettings: { ...defaultTaxSettings, taxInclusive: true },
      customerState: 'Maharashtra',
      storeState: 'AP',
    });

    expect(result.isInterState).toBe(true);
    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(180);
  });

  it('calculates inter-state GST (tax exclusive: subtotal ₹1000, customer in KA, store in AP)', () => {
    const result = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 0,
      taxSettings: { ...defaultTaxSettings, taxInclusive: false },
      customerState: 'KA',
      storeState: 'AP',
    });

    expect(result.isInterState).toBe(true);
    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(180);
  });

  it('applies discount strictly to the taxable base before tax calculation', () => {
    const result = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 200,
      taxSettings: { ...defaultTaxSettings, taxInclusive: false },
      customerState: 'AP',
      storeState: 'AP',
    });

    expect(result.taxableBase).toBe(800);
    expect(result.taxableAmount).toBe(800);
    expect(result.taxAmount).toBe(144);
    expect(result.cgst).toBe(72);
    expect(result.sgst).toBe(72);
  });

  it('enforces exact paise rounding invariant cgst + sgst === taxAmount for awkward numbers', () => {
    const awkwardValues = [1001.37, 333.33, 777.77, 49.99, 123.45, 9999.99];

    for (const subtotal of awkwardValues) {
      const result = TaxEngine.calculateTax({
        subtotal,
        discount: 0,
        taxSettings: { ...defaultTaxSettings, taxInclusive: false },
        customerState: 'AP',
        storeState: 'AP',
      });

      const sumCgstSgst = Math.round((result.cgst + result.sgst) * 100) / 100;
      expect(sumCgstSgst).toBe(result.taxAmount);
    }
  });

  it('enforces exact paise rounding invariant for tax-inclusive awkward numbers', () => {
    const awkwardValues = [1001.37, 333.33, 777.77, 49.99, 123.45, 9999.99];

    for (const subtotal of awkwardValues) {
      const result = TaxEngine.calculateTax({
        subtotal,
        discount: 0,
        taxSettings: { ...defaultTaxSettings, taxInclusive: true },
        customerState: 'AP',
        storeState: 'AP',
      });

      const sumCgstSgst = Math.round((result.cgst + result.sgst) * 100) / 100;
      expect(sumCgstSgst).toBe(result.taxAmount);
      expect(Math.round((result.taxableAmount + result.taxAmount) * 100) / 100).toBe(subtotal);
    }
  });
});

describe('Order Totals Math Integration', () => {
  it('adds tax to preliminary total when tax is exclusive', () => {
    const totals = computeOrderTotals({
      subtotal: 1000,
      discount: 100,
      depositTotal: 0,
      isCod: false,
      codFee: 0,
      freeShippingThreshold: 500,
      deliveryCharge: 50,
      platformFee: 10,
      taxAmount: 162, // 18% of (1000 - 100)
      isTaxInclusive: false,
      useWallet: false,
      walletBalance: 0,
    });

    // 1000 - 100 (discount) + 0 (shipping free >= 500) + 10 (platform) + 162 (exclusive tax) = 1072
    expect(totals.taxAmount).toBe(162);
    expect(totals.isTaxInclusive).toBe(false);
    expect(totals.preliminaryTotal).toBe(1072);
    expect(totals.total).toBe(1072);
  });

  it('does NOT add tax on top when tax is inclusive', () => {
    const totals = computeOrderTotals({
      subtotal: 1000,
      discount: 100,
      depositTotal: 0,
      isCod: false,
      codFee: 0,
      freeShippingThreshold: 500,
      deliveryCharge: 50,
      platformFee: 10,
      taxAmount: 137.29,
      isTaxInclusive: true,
      useWallet: false,
      walletBalance: 0,
    });

    // 1000 - 100 (discount) + 0 (shipping free) + 10 (platform) = 910
    expect(totals.taxAmount).toBe(137.29);
    expect(totals.isTaxInclusive).toBe(true);
    expect(totals.preliminaryTotal).toBe(910);
    expect(totals.total).toBe(910);
  });

  it('applies wallet deduction without mutating tax values', () => {
    const totals = computeOrderTotals({
      subtotal: 1000,
      discount: 0,
      depositTotal: 0,
      isCod: false,
      codFee: 0,
      freeShippingThreshold: 2000, // below threshold -> deliveryCharge applies
      deliveryCharge: 50,
      platformFee: 10,
      taxAmount: 180,
      isTaxInclusive: false,
      useWallet: true,
      walletBalance: 300,
    });

    // Gross = 1000 + 50 + 10 + 180 = 1240
    // Wallet deduction = 300
    // Net payable = 940
    expect(totals.taxAmount).toBe(180);
    expect(totals.walletDeduction).toBe(300);
    expect(totals.total).toBe(940);
  });
});

describe('Settings Drift Immutability & Invoice Snapshot', () => {
  it('locks tax snapshot fields so changing store settings never mutates the invoice snapshot', async () => {
    const taxResult = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 0,
      taxSettings: {
        gstEnabled: true,
        taxInclusive: true,
        gstRate: 0.18,
        cgstRate: 0.09,
        sgstRate: 0.09,
      },
      customerState: 'AP',
      storeState: 'AP',
    });

    const orderTotals = {
      subtotal: 1000,
      discount: 0,
      shippingFee: 0,
      codFee: 0,
      walletDeduction: 0,
      total: 1000,
    };

    const invoicingMeta = {
      hsnCode: '9973',
      invoicePrefix: 'INV-2026-',
      invoiceFooter: 'Historical terms and conditions.',
    };

    const mockStoreSettings = {
      general: { storeName: 'Siri Crafts' },
      legal: { companyName: 'Siri Crafts Pvt Ltd', cin: 'U12345' },
      taxes: {
        gstEnabled: true,
        taxInclusive: true,
        gstRate: 0.18,
        cgstRate: 0.09,
        sgstRate: 0.09,
        gstNumber: '37ABCDE1234F1Z5',
        hsnCode: '9973',
        invoicePrefix: 'INV-2026-',
        invoiceFooter: 'Historical terms and conditions.',
      },
    };

    vi.spyOn(storeSettingsService, 'getSettings').mockResolvedValue(mockStoreSettings as any);
    vi.spyOn(SequenceGeneratorService, 'generateInvoiceNumber').mockImplementation(
      async (prefix) => `${prefix}0001`,
    );

    const snapshots = await InvoiceService.generateOrderSnapshots(
      orderTotals,
      taxResult,
      invoicingMeta,
    );

    // Verify initial snapshot properties
    expect(snapshots.tax.gstRate).toBe(0.18);
    expect(snapshots.tax.cgstRate).toBe(0.09);
    expect(snapshots.tax.sgstRate).toBe(0.09);
    expect(snapshots.tax.taxableAmount).toBe(847.46);
    expect(snapshots.tax.taxAmount).toBe(152.54);
    expect(snapshots.tax.hsnCode).toBe('9973');
    expect(snapshots.tax.invoiceFooter).toBe('Historical terms and conditions.');
    expect(snapshots.invoice.number).toMatch(/^INV-2026-/);

    // Verify snapshot immutability: mutating invoicingMeta has zero impact on snapshot
    invoicingMeta.hsnCode = '9999';
    invoicingMeta.invoicePrefix = 'ACME-';
    invoicingMeta.invoiceFooter = 'New terms 2027.';

    expect(snapshots.tax.gstRate).toBe(0.18);
    expect(snapshots.tax.cgstRate).toBe(0.09);
    expect(snapshots.tax.sgstRate).toBe(0.09);
    expect(snapshots.tax.taxableAmount).toBe(847.46);
    expect(snapshots.tax.taxAmount).toBe(152.54);
    expect(snapshots.tax.hsnCode).toBe('9973');
    expect(snapshots.tax.invoiceFooter).toBe('Historical terms and conditions.');
    expect(snapshots.invoice.number).toMatch(/^INV-2026-/);
  });
});
