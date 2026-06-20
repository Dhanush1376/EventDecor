import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import redisClient from '../utils/redis';

// Note: To avoid real-time AI API drift, we mock the analyzeQueryWithAI response or rely on local fallback.
// Since we want pure deterministic snapshots, we will override GROQ_API_KEY to force local parser.
const ORIGINAL_ENV = process.env;

beforeAll(async () => {
  process.env = {
    ...ORIGINAL_ENV,
    GROQ_API_KEY: '',
    NODE_ENV: 'development',
    ALLOW_PROD_DB_LOCAL: 'true',
  };
  await connectDB();
});

afterAll(async () => {
  process.env = ORIGINAL_ENV;
  await mongoose.connection.close();
  if (redisClient && typeof redisClient.quit === 'function') {
    try {
      await redisClient.quit();
    } catch {}
  }
});

// A helper to strip volatile fields like non-deterministic IDs, timestamps, or changing stats
// We only keep deterministic ranking, IDs, titles, and scores.
const sanitizeResponse = (body: any) => {
  const clean = JSON.parse(JSON.stringify(body));
  if (clean.items) {
    clean.items = clean.items.map((i: any) => ({
      id: i.id,
      title: i.title,
      score: typeof i.score === 'number' ? Math.round(i.score * 100) / 100 : i.score,
      type: i.type,
    }));
  }
  if (clean.suggestions) {
    clean.suggestions = clean.suggestions.map((s: any) => ({
      id: s.id,
      title: s.title,
      score: typeof s.score === 'number' ? Math.round(s.score * 100) / 100 : s.score,
      type: s.type,
    }));
  }
  if (clean.recommendations) {
    Object.keys(clean.recommendations).forEach((k) => {
      clean.recommendations[k] = clean.recommendations[k].map((i: any) => ({
        id: i.id,
        title: i.title,
      }));
    });
  }
  return clean;
};

describe('Search Endpoints - Exact Ranking & Snapshot Validation', () => {
  const queries = [
    { name: 'Basic Text Search', q: 'wedding' },
    { name: 'Telugu Script Search', q: 'పెళ్లి డెకరేషన్' },
    { name: 'Transliterated Telugu Search', q: 'pelli decoration' },
    { name: 'Color + Tag Filter Search', q: 'yellow flowers wedding stage' },
    { name: 'Budget Search', q: 'wedding decor under 50k' },
  ];

  describe('GET /api/search/autocomplete', () => {
    for (const testCase of queries) {
      it(`should perfectly match ranking & results for autocomplete: "${testCase.name}"`, async () => {
        const res = await request(app).get(
          `/api/v1/search/autocomplete?q=${encodeURIComponent(testCase.q)}&limit=5`,
        );
        expect(res.status).toBe(200);
        const sanitized = sanitizeResponse(res.body);
        expect(sanitized).toMatchSnapshot();
      });
    }
  });

  describe('GET /api/v1/search/results', () => {
    for (const testCase of queries) {
      it(`should perfectly match ranking & results for full search: "${testCase.name}"`, async () => {
        const res = await request(app).get(
          `/api/v1/search/results?q=${encodeURIComponent(testCase.q)}&limit=10&page=1`,
        );
        expect(res.status).toBe(200);
        const sanitized = sanitizeResponse(res.body);
        expect(sanitized).toMatchSnapshot();
      });
    }

    it('should perfectly match results when applying explicit filters (sort, categories)', async () => {
      const res = await request(app).get(
        `/api/v1/search/results?q=traditional&categories=Wedding&sort=price_asc&limit=5`,
      );
      expect(res.status).toBe(200);
      const sanitized = sanitizeResponse(res.body);
      expect(sanitized).toMatchSnapshot();
    });
  });

  describe('GET /api/v1/search/trending', () => {
    it('should match trending search structure', async () => {
      const res = await request(app).get('/api/v1/search/trending');
      expect(res.status).toBe(200);
      // Trending may shift, so we only snapshot the structure if possible, or force deterministic trending via DB mock
      // Assuming dev DB is relatively stable for immediate before/after test.

      expect(res.body.data).toBeDefined();
      expect(res.body.data.searches).toBeDefined();
    });
  });
});
