import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Mock Razorpay to prevent actual API calls
jest.mock('../utils/payment/RazorpayGateway', () => ({
  RazorpayGateway: {
    createOrder: jest.fn().mockResolvedValue({ id: 'order_mock123' }),
  },
}));

describe('RentalCheckoutService Integration', () => {
  let productId: string;
  let userId: string;
  let replset: MongoMemoryReplSet;
  let mongoose: typeof import('mongoose');
  let Product: any;
  let PaymentAttempt: any;
  let RentalOrder: any;
  let RentalCheckoutService: any;
  let storeSettingsService: any;

  beforeAll(async () => {
    // Clear Jest module registry to prevent mock pollution
    jest.resetModules();

    // Dynamically require mongoose AFTER resetModules
    mongoose = require('mongoose');

    // Setup in-memory MongoDB Replica Set for transactions
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replset.getUri();
    process.env.MONGO_URI = uri;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(uri);

    // Mock store settings to avoid depending on default DB data
    storeSettingsService = require('../services/StoreSettingsService').default;
    jest.spyOn(storeSettingsService, 'getSettings').mockResolvedValue({
      shipping: { deliveryCharge: 50 },
      taxes: { gstRate: 0.18 },
    });

    // Dynamic imports to ensure they use the new mongoose connection
    Product = require('../models/Product').default;
    PaymentAttempt = require('../models/PaymentAttempt').default;
    RentalOrder = require('../models/RentalOrder').default;
    RentalCheckoutService =
      require('../services/rentals/RentalCheckoutService').RentalCheckoutService;

    // Initialize collections to prevent transaction catalog change errors
    await RentalOrder.createCollection();
    await PaymentAttempt.createCollection();

    const product = await Product.create({
      title: 'Mock Rental Product',
      slug: 'mock-rental-product',
      description: 'This is a mock description for the rental product test',
      primaryCategory: new mongoose.Types.ObjectId(),
      category: 'Decor',
      price: 500,
      imageSrc: '/mock.png',
      rentalEnabled: true,
      rentalMinDays: 1,
      rentalMaxDays: 30,
      rentalStock: 10,
      stock: 10,
      rentalPricing: {
        daily: 100,
        weekly: 500,
        monthly: 1500,
      },
      securityDeposit: 200,
      isDepositRefundable: true,
    });
    productId = (product._id as any).toString();
    userId = new mongoose.Types.ObjectId().toString(); // Dummy user id for testing
  });

  afterAll(async () => {
    if (Product) await Product.deleteMany({});
    if (RentalOrder) await RentalOrder.deleteMany({});
    await mongoose.connection.close();
    if (replset) await replset.stop();
  });

  describe('calculateRentalCost', () => {
    it('calculates the cost correctly for a 3-day rental', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 1); // tomorrow
      const end = new Date(start);
      end.setDate(end.getDate() + 3);

      const result = await RentalCheckoutService.calculateRentalCost(productId, start, end);

      expect(result.durationDays).toBe(3);
      expect(result.rentalRate.type).toBe('daily');
      expect(result.rentalCharge).toBe(300); // 3 days * 100
      expect(result.securityDeposit).toBe(200);
      expect(result.totalAmount).toBeGreaterThan(500); // 300 charge + 200 deposit + tax/delivery
    });

    it('throws error for dates in the past', async () => {
      const start = new Date();
      start.setDate(start.getDate() - 1); // yesterday
      const end = new Date();

      await expect(
        RentalCheckoutService.calculateRentalCost(productId, start, end),
      ).rejects.toThrow('Rental start date cannot be in the past');
    });

    it('throws error for duration below minimum', async () => {
      const productObj = await Product.findById(productId);
      if (productObj) {
        productObj.rentalMinDays = 5;
        await productObj.save();
      }

      const start = new Date();
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 2); // 2 days duration

      await expect(
        RentalCheckoutService.calculateRentalCost(productId, start, end),
      ).rejects.toThrow('Minimum rental duration is 5 day(s)');

      // Revert
      if (productObj) {
        productObj.rentalMinDays = 1;
        await productObj.save();
      }
    });
  });

  describe('createRentalOrder', () => {
    it('creates a rental order and returns razorpay order ID', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 2);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);

      const data = {
        productId,
        rentalStartDate: start,
        rentalEndDate: end,
        shippingAddress: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          address: '123 Test St',
          locality: 'Testville',
          city: 'Testville',
          state: 'TestState',
          pincode: '123456',
          latitude: 12.9716, // dummy coords
          longitude: 77.5946,
        },
        identityDocuments: [{ type: 'Aadhar', url: 'http://example.com/id.jpg' }],
        agreementAccepted: true,
        paymentMethod: 'razorpay',
      };

      const result = await RentalCheckoutService.createRentalOrder(data, userId);

      expect(result).toBeDefined();
      expect(result.rentalOrder).toBeDefined();
      expect(result.rentalOrder._id).toBeDefined();
      expect(result.razorpayOrderId).toBe('order_mock123'); // from the mock

      const dbOrder = await RentalOrder.findById(result.rentalOrder._id);
      expect(dbOrder).toBeNull(); // Not created yet

      const attempt = await PaymentAttempt.findOne({ razorpayOrderId: 'order_mock123' });
      expect(attempt).not.toBeNull();
      expect(attempt!.orderData.durationDays).toBe(3);
    });
  });
});
