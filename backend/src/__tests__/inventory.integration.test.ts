import mongoose from 'mongoose';
import Product from '../models/Product';
import InventoryReservation from '../models/InventoryReservation';
import { InventoryService } from '../services/InventoryService';

describe('Inventory Integration', () => {
  let testProductId: string;

  beforeAll(async () => {
    // Setup in-memory MongoDB or connect to local test DB
    // CRITICAL FIX: Always override MONGO_URI for tests to prevent wiping production data
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/eventdecor_test_inventory';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    // Make sure we have a clean state
    await Product.deleteMany({}, { bypassDestructionGuard: true });
    await InventoryReservation.deleteMany({}, { bypassDestructionGuard: true });

    const product = await Product.create({
      title: 'Test Decor Item',
      slug: 'test-decor-item-inv',
      description: 'A test decor item',
      price: 100,
      stock: 1, // Only 1 available
      reservedStock: 0,
      isActive: true,
      category: 'Wedding',
      imageSrc: 'test.jpg',
    });
    testProductId = (product._id as mongoose.Types.ObjectId).toString();
  });

  afterAll(async () => {
    await Product.deleteMany({}, { bypassDestructionGuard: true });
    await InventoryReservation.deleteMany({}, { bypassDestructionGuard: true });
    await mongoose.connection.close();
  });

  describe('Concurrent Reservation', () => {
    it('handles concurrent reservations for 1 remaining item safely', async () => {
      // Simulate 20 concurrent reservation requests for 1 item
      const promises = Array(20)
        .fill(0)
        .map((_, index) => {
          return InventoryService.reserveInventory(
            testProductId,
            1,
            new mongoose.Types.ObjectId().toString(),
            15, // 15 mins
          );
        });

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Only exactly ONE should succeed
      expect(fulfilled.length).toBe(1);
      // The rest 19 should fail with "Insufficient stock"
      expect(rejected.length).toBe(19);

      const product = await Product.findById(testProductId);
      expect(product?.stock).toBe(1); // stock is not deducted until confirmed
      expect(product?.reservedStock).toBe(1); // 0 + 1 = 1
    });
  });

  describe('Reservation Expiry Sweep', () => {
    it('sweeps expired reservations and restores stock', async () => {
      // Manually set the reservation to expired
      await InventoryReservation.updateOne(
        { product: testProductId },
        { expiresAt: new Date(Date.now() - 10000) }, // Expired 10 seconds ago
      );

      const sweptCount = await InventoryService.sweepExpiredReservations();
      expect(sweptCount).toBe(1);

      const product = await Product.findById(testProductId);
      expect(product?.stock).toBe(1);
      expect(product?.reservedStock).toBe(0);

      const reservation = await InventoryReservation.findOne({ product: testProductId });
      expect(reservation?.status).toBe('expired');
    });
  });

  describe('Inventory Reconciliation', () => {
    it('detects and fixes drift', async () => {
      // Create artificial drift: product says reserved=2, but there are no active reservations
      await Product.findByIdAndUpdate(testProductId, {
        stock: 0,
        reservedStock: 1,
      });

      const {
        InventoryReconciliationService,
      } = require('../services/InventoryReconciliationService');
      const result = await InventoryReconciliationService.reconcileStockCounts();

      expect(result.discrepanciesFound).toBe(1);

      const fixedProduct = await Product.findById(testProductId);
      expect(fixedProduct?.stock).toBe(0);
      expect(fixedProduct?.reservedStock).toBe(0);
    });
  });
});
