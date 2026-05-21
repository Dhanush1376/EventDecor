import request from 'supertest';
import app from '../app';
import OrderService from '../services/orderService';

describe('Public API integration', () => {
  it('GET /api/version returns version payload', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).not.toHaveProperty('environment');
  });

  it('GET /api/readiness returns readiness JSON', async () => {
    const res = await request(app).get('/api/readiness');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('ready');
  });
});

describe('OrderService webhook signature', () => {
  it('rejects invalid webhook signatures', () => {
    const valid = OrderService.verifyWebhookSignature(
      'deadbeef',
      Buffer.from('{"event":"test"}'),
      'test_secret'
    );
    expect(valid).toBe(false);
  });
});
