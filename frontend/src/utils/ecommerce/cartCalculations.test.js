import { describe, it, expect } from 'vitest';
import {
  cleanRentalInfo,
  calculateCartSummary,
  transformDbCart,
} from '../ecommerce/cartCalculations';

describe('cartCalculations', () => {
  describe('cleanRentalInfo', () => {
    it('returns undefined if rentalInfo is falsy', () => {
      expect(cleanRentalInfo(null)).toBeUndefined();
      expect(cleanRentalInfo(undefined)).toBeUndefined();
    });

    it('returns undefined if startDate or endDate are missing', () => {
      expect(cleanRentalInfo({ startDate: '2026-06-23' })).toBeUndefined();
      expect(cleanRentalInfo({ endDate: '2026-06-25' })).toBeUndefined();
    });

    it('returns undefined for invalid dates', () => {
      expect(cleanRentalInfo({ startDate: 'invalid', endDate: 'invalid' })).toBeUndefined();
    });

    it('calculates duration correctly and formats dates to ISO', () => {
      const result = cleanRentalInfo({
        startDate: '2026-06-23T10:00:00Z',
        endDate: '2026-06-25T10:00:00Z',
      });
      expect(result).toBeDefined();
      expect(result.duration).toBe(2);
      expect(result.startDate).toBe('2026-06-23T10:00:00.000Z');
      expect(result.endDate).toBe('2026-06-25T10:00:00.000Z');
    });

    it('uses provided duration if available', () => {
      const result = cleanRentalInfo({
        startDate: '2026-06-23T10:00:00Z',
        endDate: '2026-06-25T10:00:00Z',
        duration: 5,
      });
      expect(result.duration).toBe(5);
    });
  });

  describe('calculateCartSummary', () => {
    it('calculates subtotal and total for purchase cart', () => {
      const items = [
        { price: 100, quantity: 2 },
        { product: { price: 50 }, quantity: 1 },
      ];
      const result = calculateCartSummary(items, 'purchase', 20);
      expect(result.subtotal).toBe(250);
      expect(result.depositTotal).toBe(0);
      expect(result.total).toBe(270); // 250 + 20
    });

    it('calculates depositTotal for rental cart', () => {
      const items = [
        { price: 100, deposit: 50, quantity: 2 },
        { product: { price: 50, securityDeposit: 25 }, quantity: 1 },
      ];
      const result = calculateCartSummary(items, 'rental', 0);
      expect(result.subtotal).toBe(250);
      expect(result.depositTotal).toBe(125); // (50 * 2) + (25 * 1)
      expect(result.total).toBe(375); // 250 + 125
    });
  });

  describe('transformDbCart', () => {
    it('returns empty array if dbCartItems is not an array', () => {
      expect(transformDbCart(null)).toEqual([]);
      expect(transformDbCart({})).toEqual([]);
    });

    it('transforms items correctly', () => {
      const dbItems = [
        {
          quantity: 2,
          type: 'purchase',
          product: {
            _id: 'p1',
            title: 'Test Product',
            price: 100,
            stock: 5,
          },
        },
      ];
      const result = transformDbCart(dbItems);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(result[0]._id).toBe('p1');
      expect(result[0].title).toBe('Test Product');
      expect(result[0].price).toBe(100);
      expect(result[0].quantity).toBe(2);
      expect(result[0].stock).toBe(5);
      expect(result[0].oldPrice).toBe(100);
      expect(result[0].variant).toBe('Default');
      expect(result[0].seller).toBe('Siri Arts Artisans');
    });

    it('filters out items without a product', () => {
      const dbItems = [
        { quantity: 1 }, // No product
        { quantity: 1, product: { _id: 'p1', price: 10 } },
      ];
      const result = transformDbCart(dbItems);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });
  });
});
