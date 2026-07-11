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

  it('prices rentals per day using daily pricing', () => {
    const items = [
      {
        product: { price: 999, rentalPricing: { daily: 200 } },
        quantity: 1,
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-04' },
      },
    ];
    // 3 days * 200/day
    expect(calculateCartSummary(items, 'rental').subtotal).toBe(600);
  });

  it('uses weekly pricing for 7+ day rentals', () => {
    const items = [
      {
        product: { price: 999, rentalPricing: { daily: 200, weekly: 700 } },
        quantity: 1,
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-08' },
      },
    ];
    // 7 days at weekly rate: (700/7) * 7
    expect(calculateCartSummary(items, 'rental').subtotal).toBe(700);
  });

  it('includes security deposits for rentals', () => {
    const items = [
      {
        product: { price: 100, deposit: 500, rentalPricing: { daily: 100 } },
        quantity: 2,
        rentalInfo: { startDate: '2026-07-01', endDate: '2026-07-02' },
      },
    ];
    const summary = calculateCartSummary(items, 'rental');
    expect(summary.depositTotal).toBe(1000);
    expect(summary.total).toBe(summary.subtotal + 1000);
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
});
