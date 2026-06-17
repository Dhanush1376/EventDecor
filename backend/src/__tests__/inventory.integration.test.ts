import { MongoMemoryReplSet } from 'mongodb-memory-server';

describe('Inventory Integration', () => {
  let testProductId: string;
  let replset: MongoMemoryReplSet;
  let mongoose: any;
  let Product: any;
  let InventoryReservation: any;
  let InventoryLog: any;
  let InventoryService: any;

  beforeAll(async () => {
    // Clear Jest module registry to prevent mock pollution from other tests
    jest.resetModules();

    // Dynamically require mongoose AFTER resetModules so it matches the instance used by models
    mongoose = require('mongoose');

    // Setup in-memory MongoDB Replica Set for transactions
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replset.getUri();
    process.env.MONGO_URI = uri;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(uri);

    // Dynamically require the real models and service
    Product = require('../models/Product').default;
    InventoryReservation = require('../models/InventoryReservation').default;
    InventoryLog = require('../models/InventoryLog').default;
    InventoryService = require('../services/InventoryService').InventoryService;

    // Pre-create collections and build indexes to prevent MongoDB transaction "catalog changes" write failures
    await Product.createCollection();
    await Product.init();
    await InventoryReservation.createCollection();
    await InventoryReservation.init();
    await InventoryLog.createCollection();
    await InventoryLog.init();

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
    testProductId = product._id.toString();
  });

  afterAll(async () => {
    await Product.deleteMany({}, { bypassDestructionGuard: true });
    await InventoryReservation.deleteMany({}, { bypassDestructionGuard: true });
    await mongoose.connection.close();
    await replset.stop();
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
