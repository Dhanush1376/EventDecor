import request from 'supertest';
import app from '../app';

describe('Razorpay webhook Content-Type', () => {
  it('rejects requests without application/json Content-Type', async () => {
    const res = await request(app)
      .post('/api/orders/webhook')
      .set('Content-Type', 'text/plain')
      .send('not-json');

    expect(res.status).toBe(415);
    expect(res.body.message).toMatch(/application\/json/i);
  });

  it('rejects empty JSON body before signature check', async () => {
    const res = await request(app)
      .post('/api/orders/webhook')
      .set('Content-Type', 'application/json')
      .send('');

    expect(res.status).toBe(400);
  });
});
