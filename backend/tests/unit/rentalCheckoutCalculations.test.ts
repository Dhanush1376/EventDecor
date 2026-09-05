import '../integration/setup';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { RentalCheckoutService } from '../../src/services/rentals/RentalCheckoutService';
import Product from '../../src/models/Product';
import Category from '../../src/models/Category';

describe('RentalCheckoutService Calculations', () => {
  it('accepts duration within package duration (up to X days) and charges package price', async () => {
    const category = await Category.create({
      name: 'Rental Category',
      slug: `rental-cat-${Date.now()}`,
    } as any);
    const product = await Product.create({
      title: '7-Day Backdrop Setup',
      slug: `backdrop-setup-${Date.now()}`,
      primaryCategory: category._id,
      price: 2000,
      imageSrc: 'https://example.com/backdrop.webp',
      description: 'Backdrop for events',
      stock: 5,
      isRental: true,
      rentalEnabled: true,
      securityDeposit: 500,
      rentalPricing: {
        rentalPrice: 1200,
        rentalDurationDays: 7,
        minRentalDays: 1,
      },
    } as any);

    // Test 4-day duration (within 1 to 7 days package)
    const startDate = new Date('2026-10-01T10:00:00.000Z');
    const endDate = new Date('2026-10-05T10:00:00.000Z'); // 4 days

    const result = await RentalCheckoutService.calculateRentalCost(
      (product._id as mongoose.Types.ObjectId).toString(),
      startDate,
      endDate,
    );

    expect(result.durationDays).toBe(4);
    expect(result.rentalCharge).toBe(1200);
    expect(result.securityDeposit).toBe(500);
    // When taxes are tax-inclusive, GST should not be added on top
    expect(result.totalAmount).toBe(
      result.rentalCharge + result.securityDeposit + result.deliveryCharge,
    );
  });

  it('rejects duration exceeding package duration', async () => {
    const category = await Category.create({
      name: 'Rental Category 2',
      slug: `rental-cat2-${Date.now()}`,
    } as any);
    const product = await Product.create({
      title: '3-Day Canopy',
      slug: `canopy-${Date.now()}`,
      primaryCategory: category._id,
      price: 1500,
      imageSrc: 'https://example.com/canopy.webp',
      description: 'Canopy setup',
      stock: 5,
      isRental: true,
      rentalEnabled: true,
      securityDeposit: 300,
      rentalPricing: {
        rentalPrice: 800,
        rentalDurationDays: 3,
        minRentalDays: 1,
      },
    } as any);

    // 5-day duration (exceeds 3 days)
    const startDate = new Date('2026-10-01T10:00:00.000Z');
    const endDate = new Date('2026-10-06T10:00:00.000Z'); // 5 days

    await expect(
      RentalCheckoutService.calculateRentalCost(
        (product._id as mongoose.Types.ObjectId).toString(),
        startDate,
        endDate,
      ),
    ).rejects.toThrow(/cannot exceed 3 day/i);
  });

  it('correctly scales rental charge and security deposit with quantity', async () => {
    const category = await Category.create({
      name: 'Rental Category 3',
      slug: `rental-cat3-${Date.now()}`,
    } as any);
    const product = await Product.create({
      title: 'Party Chair',
      slug: `party-chair-${Date.now()}`,
      primaryCategory: category._id,
      price: 1500,
      imageSrc: 'https://example.com/chair.webp',
      description: 'Party chair',
      stock: 10,
      isRental: true,
      rentalEnabled: true,
      securityDeposit: 600,
      rentalPricing: {
        rentalPrice: 799,
        rentalDurationDays: 7,
        minRentalDays: 1,
      },
    } as any);

    const startDate = new Date('2026-10-01T10:00:00.000Z');
    const endDate = new Date('2026-10-06T10:00:00.000Z'); // 5 days

    const result = await RentalCheckoutService.calculateRentalCost(
      (product._id as mongoose.Types.ObjectId).toString(),
      startDate,
      endDate,
      2, // Quantity: 2
    );

    expect(result.quantity).toBe(2);
    expect(result.rentalCharge).toBe(1598); // 799 * 2
    expect(result.securityDeposit).toBe(1200); // 600 * 2
    expect(result.totalAmount).toBe(
      result.rentalCharge + result.securityDeposit + result.deliveryCharge,
    );
  });
});
