import request from 'supertest';
import app from '../app';
import { RecommendationCache } from '../services/recommendation/recommendationCache';

// Mock Mongoose models to prevent live DB connection timeouts
jest.mock('../models/Product', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: '6a18315776e357ead3a22319',
        category: 'Wedding',
        title: 'Mock Product',
        price: 100,
        imageSrc: '/mock.png',
        slug: 'mock-product',
      }),
    })),
    find: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: '6a18315776e357ead3a22320',
          category: 'Wedding',
          title: 'Mock Product 2',
          price: 150,
          imageSrc: '/mock2.png',
          slug: 'mock-product-2',
        },
      ]),
    })),
  },
}));

jest.mock('../models/Event', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: '6a18315776e357ead3a22321',
        category: 'Wedding',
        style: 'Traditional',
        title: 'Mock Event',
        basePrice: 5000,
      }),
    })),
    find: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: '6a18315776e357ead3a22322',
          category: 'Wedding',
          style: 'Traditional',
          title: 'Mock Event 2',
          basePrice: 6000,
        },
      ]),
    })),
  },
}));

jest.mock('../models/UserInteraction', () => ({
  __esModule: true,
  default: {
    distinct: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    })),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../models/UserPreferenceProfile', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  },
}));

describe('Recommendation API integration', () => {
  const dummyProductId = '6a18315776e357ead3a22319';

  beforeAll(async () => {
    // Ensure cache is cleared for clean testing
    await RecommendationCache.clearPersonalFeed('test-user-id');
  });

  it('GET /api/v1/recommendations/feed returns fallback recommendations and triggers async job on cache miss', async () => {
    const res = await request(app)
      .get('/api/v1/recommendations/feed?limit=4')
      .query({ userId: 'test-user-id' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data.isFallback).toBe(true);
    expect(res.body.data.fromCache).toBe(false);
  });

  it('GET /api/v1/recommendations/similar/product/:targetId returns fallback and triggers precomputation on cache miss', async () => {
    const res = await request(app).get(
      `/api/v1/recommendations/similar/product/${dummyProductId}?limit=4`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data.isFallback).toBe(true);
    expect(res.body.data.fromCache).toBe(false);
  });

  it('GET /api/v1/recommendations/complete-setup/:targetId returns setup fallback', async () => {
    const res = await request(app).get(
      `/api/v1/recommendations/complete-setup/${dummyProductId}?limit=4`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data.isFallback).toBe(true);
  });

  it('GET /api/v1/recommendations/also-viewed/:targetId returns also-viewed fallback', async () => {
    const res = await request(app).get(
      `/api/v1/recommendations/also-viewed/${dummyProductId}?limit=4`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data.isFallback).toBe(true);
  });
});
