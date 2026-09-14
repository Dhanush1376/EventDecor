/**
 * Pure, server-authoritative order total computation.
 *
 * This is the money math the backend trusts — the client's claimed total is
 * never used. Extracted from OrderCheckoutService so it can be unit-tested in
 * isolation and reused. All amounts are in whole rupees.
 */
export interface OrderTotalsInput {
  /** Sum of item price × quantity, before any adjustments. */
  subtotal: number;
  /** Absolute discount amount (already resolved from the coupon). */
  discount: number;
  /** Total refundable deposits (rentals); 0 for standard purchases. */
  depositTotal: number;
  /** Whether this is a Cash-on-Delivery order. */
  isCod: boolean;
  /** COD surcharge from store settings. */
  codFee: number;
  /** Order subtotal above which shipping is free. */
  freeShippingThreshold: number;
  /** Flat delivery charge applied below the free-shipping threshold. */
  deliveryCharge: number;
  /** Whether the customer opted to redeem wallet (Siri Cash) balance. */
  useWallet: boolean;
  /** Current wallet balance available to redeem. */
  walletBalance: number;
}

export interface OrderTotals {
  shippingFee: number;
  codFee: number;
  /** Total before wallet redemption, floored at 0. */
  preliminaryTotal: number;
  /** Amount actually redeemed from the wallet. */
  walletDeduction: number;
  /** Final payable amount. */
  total: number;
}

export const computeOrderTotals = (input: OrderTotalsInput): OrderTotals => {
  const {
    subtotal,
    discount,
    depositTotal,
    isCod,
    codFee: configuredCodFee,
    freeShippingThreshold,
    deliveryCharge,
    useWallet,
    walletBalance,
  } = input;

  const shippingFee = subtotal > freeShippingThreshold ? 0 : deliveryCharge;

  // Preliminary payable amount before COD fee
  const preliminaryWithoutCod = Math.max(0, subtotal + shippingFee + depositTotal - discount);
  const isFullyCoveredByWallet = Boolean(
    useWallet && (walletBalance || 0) >= preliminaryWithoutCod,
  );

  // If order is completely free or fully covered by wallet, no cash is collected on delivery, so COD fee is waived
  const codFee =
    isCod && !isFullyCoveredByWallet && preliminaryWithoutCod > 0 ? configuredCodFee : 0;

  // Never let discounts/wallet drive the payable below zero.
  const preliminaryTotal = Math.max(0, preliminaryWithoutCod + codFee);

  let walletDeduction = 0;
  if (useWallet) {
    const redeemable = Math.min(preliminaryTotal, walletBalance || 0);
    if (redeemable > 0) walletDeduction = redeemable;
  }

  const total = preliminaryTotal - walletDeduction;

  return { shippingFee, codFee, preliminaryTotal, walletDeduction, total };
};
