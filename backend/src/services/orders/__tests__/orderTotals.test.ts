import { describe, it, expect } from 'vitest';
import { computeOrderTotals, OrderTotalsInput } from '../orderTotals';

const base: OrderTotalsInput = {
  subtotal: 1000,
  discount: 0,
  depositTotal: 0,
  isCod: false,
  codFee: 90,
  freeShippingThreshold: 2000,
  deliveryCharge: 100,
  useWallet: false,
  walletBalance: 0,
};

describe('computeOrderTotals', () => {
  it('applies flat shipping below the free-shipping threshold', () => {
    const t = computeOrderTotals({ ...base, subtotal: 1000 });
    expect(t.shippingFee).toBe(100);
    expect(t.total).toBe(1100);
  });

  it('gives free shipping strictly above the threshold', () => {
    expect(computeOrderTotals({ ...base, subtotal: 2001 }).shippingFee).toBe(0);
    // Exactly at the threshold still pays shipping (uses `>` not `>=`).
    expect(computeOrderTotals({ ...base, subtotal: 2000 }).shippingFee).toBe(100);
  });

  it('adds the COD fee only for COD orders', () => {
    expect(computeOrderTotals({ ...base, isCod: true }).codFee).toBe(90);
    expect(computeOrderTotals({ ...base, isCod: false }).codFee).toBe(0);
    expect(computeOrderTotals({ ...base, subtotal: 1000, isCod: true }).total).toBe(
      1000 + 100 + 90,
    );
  });

  it('subtracts the discount from the total', () => {
    const t = computeOrderTotals({ ...base, subtotal: 1000, discount: 250 });
    expect(t.total).toBe(1000 + 100 - 250);
  });

  it('never lets the total go below zero even with an oversized discount', () => {
    const t = computeOrderTotals({ ...base, subtotal: 500, discount: 100000 });
    expect(t.preliminaryTotal).toBe(0);
    expect(t.total).toBe(0);
  });

  it('includes refundable deposits in the payable amount', () => {
    const t = computeOrderTotals({ ...base, subtotal: 1000, depositTotal: 500 });
    expect(t.total).toBe(1000 + 100 + 500);
  });

  it('redeems wallet balance but never more than the payable amount', () => {
    // Balance exceeds the bill → capped at the bill (total goes to 0).
    const capped = computeOrderTotals({
      ...base,
      subtotal: 1000,
      useWallet: true,
      walletBalance: 5000,
    });
    expect(capped.walletDeduction).toBe(1100); // 1000 + 100 shipping
    expect(capped.total).toBe(0);

    // Partial redemption.
    const partial = computeOrderTotals({
      ...base,
      subtotal: 1000,
      useWallet: true,
      walletBalance: 300,
    });
    expect(partial.walletDeduction).toBe(300);
    expect(partial.total).toBe(800); // 1100 - 300
  });

  it('does not redeem wallet when useWallet is false', () => {
    const t = computeOrderTotals({
      ...base,
      subtotal: 1000,
      useWallet: false,
      walletBalance: 5000,
    });
    expect(t.walletDeduction).toBe(0);
    expect(t.total).toBe(1100);
  });

  it('composes discount + COD + shipping + deposit + wallet correctly', () => {
    const t = computeOrderTotals({
      subtotal: 1500,
      discount: 200,
      depositTotal: 300,
      isCod: true,
      codFee: 90,
      freeShippingThreshold: 2000,
      deliveryCharge: 100,
      useWallet: true,
      walletBalance: 500,
    });
    // preliminary = 1500 + 100 shipping + 90 cod + 300 deposit - 200 discount = 1790
    expect(t.preliminaryTotal).toBe(1790);
    expect(t.walletDeduction).toBe(500);
    expect(t.total).toBe(1290);
  });
});
