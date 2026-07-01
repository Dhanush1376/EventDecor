import { MongoMemoryReplSet } from 'mongodb-memory-server';
describe('RentalAvailabilityService Integration', () => {
  let replset: MongoMemoryReplSet;
  let mongoose: typeof import('mongoose');
  let Product: any;
  let RentalOrder: any;
  let RentalAvailabilityService: any;

  beforeAll(async () => {
    jest.resetModules();
    mongoose = require('mongoose');

    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replset.getUri();
    process.env.MONGO_URI = uri;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(uri);

    Product = require('../models/Product').default;
    RentalOrder = require('../models/RentalOrder').default;
    RentalAvailabilityService =
      require('../services/rentals/RentalAvailabilityService').RentalAvailabilityService;

    await RentalOrder.createCollection();
  });

  afterAll(async () => {
    if (Product) await Product.deleteMany({});
    if (RentalOrder) await RentalOrder.deleteMany({});
    await mongoose.connection.close();
    if (replset) await replset.stop();
  });

  it('checks availability correctly when stock is available', async () => {
    const product = await Product.create({
      title: 'Mock Rental Product',
      slug: 'mock-rental-product-avail',
      description: 'Test product for availability',
      primaryCategory: new mongoose.Types.ObjectId(),
      imageSrc: '/mock.png',
      price: 500,
      rentalEnabled: true,
      rentalStock: 5,
      stock: 5,
    });

    const start = new Date();
    start.setDate(start.getDate() + 2);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    const result = await RentalAvailabilityService.checkAvailability(
      product._id.toString(),
      start,
      end,
    );
    expect(result.available).toBe(true);
    expect(result.unitNumber).toBeDefined();
  });

  it('returns unavailable when all stock is booked', async () => {
    const product = await Product.create({
      title: 'Mock Rental Product 2',
      slug: 'mock-rental-product-booked',
      description: 'Test product for full booking',
      primaryCategory: new mongoose.Types.ObjectId(),
      tags: ['rental'],
      imageSrc: '/mock2.png',
      price: 500,
      rentalEnabled: true,
      rentalStock: 1, // Only 1 stock
      stock: 1,
    });

    const start = new Date();
    start.setDate(start.getDate() + 2);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    // Book the 1 stock using lockDates
    const orderId = new mongoose.Types.ObjectId().toString();
    const dates = RentalAvailabilityService.getDatesInRange(start, end);
    await RentalAvailabilityService.lockDates(product._id.toString(), orderId, 1, dates);

    // Check again
    const result = await RentalAvailabilityService.checkAvailability(
      product._id.toString(),
      start,
      end,
    );
    expect(result.available).toBe(false);
    expect(result.reason).toContain('Product is fully booked');
  });
});
