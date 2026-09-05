import { describe, it, expect } from 'vitest';
import { cleanRentalInfo, calculateCartSummary, transformDbCart } from '../cartCalculations';

describe('cleanRentalInfo', () => {
  it('returns undefined for missing or partial input', () => {
    expect(cleanRentalInfo(undefined)).toBeUndefined();
    expect(cleanRentalInfo({})).toBeUndefined();
    expect(cleanRentalInfo({ startDate: '2026-07-01' })).toBeUndefined();
  });

  it('returns undefined for unparseable dates', () => {
    expect(cleanRentalInfo({ startDate: 'not-a-date', endDate: '2026-07-05' })).toBeUndefined();
  });

  it('normalizes valid ranges to ISO strings with a computed duration', () => {
    const result = cleanRentalInfo({ startDate: '2026-07-01', endDate: '2026-07-05' });
    expect(result.startDate).toBe(new Date('2026-07-01').toISOString());
    expect(result.endDate).toBe(new Date('2026-07-05').toISOString());
    expect(result.duration).toBe(4);
  });

  it('prefers an explicit numeric duration over the computed one', () => {
    const result = cleanRentalInfo({
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      duration: '10',
    });
    expect(result.duration).toBe(10);
  });
});

describe('calculateCartSummary', () => {
  it('sums purchase items with quantity', () => {
    const items = [
      { product: { price: 100 }, quantity: 2 },
      { product: { price: 50 }, quantity: 1 },
    ];
    expect(calculateCartSummary(items, 'purchase')).toEqual({
      subtotal: 250,
      depositTotal: 0,
      total: 250,
    });
  });

  it('adds shipping fee into the total only', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 'purchase', 49);
    expect(summary.subtotal).toBe(100);
    expect(summary.total).toBe(149);
  });

  it('prices rentals using total package price (not multiplied by days)', () => {
    const items = [
      {
        product: { price: 999, rentalPricing: { rentalPrice: 699, rentalDurationDays: 5 } },
        quantity: 1,
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-06' },
      },
    ];
    // Complete package price is 699 (NOT 699 * 5)
    expect(calculateCartSummary(items, 'rental').subtotal).toBe(699);
  });

  it('multiplies package rental price by quantity', () => {
    const items = [
      {
        product: { price: 999, rentalPricing: { rentalPrice: 500, rentalDurationDays: 3 } },
        quantity: 2,
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-04' },
      },
    ];
    expect(calculateCartSummary(items, 'rental').subtotal).toBe(1000);
  });

  it('includes security deposits for rentals', () => {
    const items = [
      {
        product: {
          price: 100,
          deposit: 500,
          rentalPricing: { rentalPrice: 300, rentalDurationDays: 2 },
        },
        quantity: 2,
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-03' },
      },
    ];
    const summary = calculateCartSummary(items, 'rental');
    expect(summary.subtotal).toBe(600);
    expect(summary.depositTotal).toBe(1000);
    expect(summary.total).toBe(1600);
  });
});

describe('transformDbCart', () => {
  it('returns an empty array for null/undefined/non-array input', () => {
    expect(transformDbCart(null)).toEqual([]);
    expect(transformDbCart(undefined)).toEqual([]);
    expect(transformDbCart({})).toEqual([]);
  });

  it('drops items whose product reference failed to populate', () => {
    const items = [
      { product: null, quantity: 1 },
      { product: { _id: 'p1', title: 'Vase', price: 100 }, quantity: 2 },
    ];
    const result = transformDbCart(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].quantity).toBe(2);
  });

  it('defaults type to purchase and variant to Default', () => {
    const [item] = transformDbCart([
      { product: { _id: 'p1', title: 'Vase', price: 100 }, quantity: 1 },
    ]);
    expect(item.type).toBe('purchase');
    expect(item.variant).toBe('Default');
  });

  it('normalizes rentalInfo through cleanRentalInfo', () => {
    const [item] = transformDbCart([
      {
        product: { _id: 'p1', title: 'Arch', price: 100 },
        quantity: 1,
        type: 'rental',
        rentalInfo: { startDate: 'garbage', endDate: '2026-07-05' },
      },
    ]);
    expect(item.rentalInfo).toBeUndefined();
  });

  it('maps rental product with package rentalPrice', () => {
    const [item] = transformDbCart([
      {
        product: {
          _id: 'p1',
          title: 'Wedding Arch',
          price: 1500,
          rentalPricing: { rentalPrice: 699, rentalDurationDays: 5 },
          securityDeposit: 300,
        },
        quantity: 1,
        type: 'rental',
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-06' },
      },
    ]);
    expect(item.type).toBe('rental');
    expect(item.price).toBe(699);
    expect(item.oldPrice).toBe(699);
    expect(item.deposit).toBe(300);
  });
});
