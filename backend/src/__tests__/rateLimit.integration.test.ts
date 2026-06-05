import type { Application } from 'express';
import request from 'supertest';

describe('Rate limiting (TEST_RATE_LIMIT)', () => {
  let app: Application;

  beforeAll(() => {
    process.env.TEST_RATE_LIMIT = 'true';
    jest.resetModules();

    app = require('../app').default;
  });

  afterAll(() => {
    delete process.env.TEST_RATE_LIMIT;
    jest.resetModules();
  });

  it('returns 429 after exceeding the test limit', async () => {
    const paths = ['/api/version'];
    const statuses: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get(paths[i % paths.length]);
      statuses.push(res.status);
    }

    expect(statuses.some((s) => s === 429)).toBe(true);
  });
});
