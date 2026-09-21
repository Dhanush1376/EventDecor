import { ApiError } from '../../utils/ApiError';
import { canonicalizeState } from '../../utils/stateCanonicalizer';

export interface TaxEngineConfig {
  gstEnabled: boolean;
  taxInclusive: boolean;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
}

export interface TaxCalculationParams {
  /** Taxable subtotal (for purchase: product subtotal; for rental: rentalCharge) */
  subtotal: number;
  /** Applied coupon or item discount */
  discount?: number;
  /** Store registered state (e.g. 'Andhra Pradesh', 'AP') */
  storeState?: string | null;
  /** Customer shipping destination state */
  customerState?: string | null;
  /** Active tax configuration */
  taxConfig?: Partial<TaxEngineConfig>;
  taxSettings?: Partial<TaxEngineConfig>;
}

export interface TaxCalculationResult {
  taxableBase: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  isInterState: boolean;
  taxInclusive: boolean;
  isTaxInclusive: boolean;
  gstEnabled: boolean;
  isGstEnabled: boolean;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  customerState?: string;
  storeState?: string;
}

export class TaxEngine {
  /**
   * Pure, authoritative calculation of taxes.
   *
   * Responsibilities:
   * - Calculates ONLY tax components (taxableAmount, taxAmount, cgst, sgst, igst).
   * - Never calculates grand totals or payable order totals.
   * - Resolves intra-state (CGST + SGST) vs inter-state (IGST) using canonical states.
   * - Enforces exact paise-reconciliation: cgst + sgst === taxAmount.
   */
  public static calculateTax(params: TaxCalculationParams): TaxCalculationResult {
    const { subtotal = 0, discount = 0, storeState, customerState } = params;
    const config = params.taxConfig || params.taxSettings || {};

    // Validate customer destination state
    const canonicalCustomerState = canonicalizeState(customerState);
    if (!canonicalCustomerState) {
      throw new ApiError(
        400,
        'Destination state is required and must be a valid Indian State or Union Territory for delivery and tax compliance.',
      );
    }

    // Resolve store state (defaults to 'AP' if unconfigured)
    const canonicalStoreState = canonicalizeState(storeState) || 'AP';
    const isInterState = canonicalStoreState !== canonicalCustomerState;

    const gstEnabled = Boolean(config.gstEnabled ?? true);
    const taxInclusive = Boolean(config.taxInclusive ?? true);
    const gstRate = Math.max(0, Number(config.gstRate ?? 0.18));
    const cgstRate = Math.max(0, Number(config.cgstRate ?? gstRate / 2));
    const sgstRate = Math.max(0, Number(config.sgstRate ?? gstRate / 2));

    // Taxable base is strictly (subtotal - discount), never negative
    const taxableBase = Math.max(0, Number((subtotal - (discount || 0)).toFixed(2)));

    if (!gstEnabled || gstRate <= 0 || taxableBase === 0) {
      return {
        taxableBase,
        taxableAmount: taxableBase,
        taxAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        isInterState,
        taxInclusive,
        isTaxInclusive: taxInclusive,
        gstEnabled,
        isGstEnabled: gstEnabled,
        gstRate,
        cgstRate,
        sgstRate,
        customerState: canonicalCustomerState,
        storeState: canonicalStoreState,
      };
    }

    let taxableAmount: number;
    let taxAmount: number;

    if (taxInclusive) {
      // Product prices already include GST — extract the basic taxable value
      taxableAmount = Number((taxableBase / (1 + gstRate)).toFixed(2));
      taxAmount = Number((taxableBase - taxableAmount).toFixed(2));
    } else {
      // GST is on top of the taxable base
      taxableAmount = taxableBase;
      taxAmount = Number((taxableAmount * gstRate).toFixed(2));
    }

    let cgst: number;
    let sgst: number;
    let igst: number;

    if (isInterState) {
      // Inter-state: Full tax goes to IGST
      igst = taxAmount;
      cgst = 0;
      sgst = 0;
    } else {
      // Intra-state: Split between CGST and SGST
      const totalRatio = cgstRate + sgstRate > 0 ? cgstRate + sgstRate : gstRate;
      const cgstFraction = cgstRate / (totalRatio || 1);
      cgst = Number((taxAmount * cgstFraction).toFixed(2));
      // Reconcile SGST to guarantee cgst + sgst === taxAmount down to the paise
      sgst = Number((taxAmount - cgst).toFixed(2));
      igst = 0;
    }

    return {
      taxableBase,
      taxableAmount,
      taxAmount,
      cgst,
      sgst,
      igst,
      isInterState,
      taxInclusive,
      isTaxInclusive: taxInclusive,
      gstEnabled,
      isGstEnabled: gstEnabled,
      gstRate,
      cgstRate,
      sgstRate,
      customerState: canonicalCustomerState,
      storeState: canonicalStoreState,
    };
  }
}

export default TaxEngine;
