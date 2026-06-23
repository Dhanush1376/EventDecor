import request from 'supertest';
import app from '../app';
import { isOriginAllowed } from '../config/corsConfig';

describe('CSRF protection', () => {
  const withOrigin = (req: request.Test) => req.set('Origin', 'http://localhost:5173');

  it('rejects mutating requests without a matching CSRF token', async () => {
    // We omit Origin entirely. If we sent an untrusted Origin, CORS would block it with 500.
    // If we sent a trusted Origin, the new bypass logic would allow it.
    // By sending no Origin, it passes CORS but fails CSRF validation.
    const res = await request(app)
      .post('/api/auth/check-email')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CSRF/i);
  });

  it('allows mutating requests when cookie and header match', async () => {
    const tokenRes = await withOrigin(request(app).get('/api/csrf-token'));
    expect(tokenRes.status).toBe(200);
    const csrfToken = tokenRes.body.csrfToken;
    const cookie = tokenRes.headers['set-cookie']?.[0]?.split(';')[0];

    const res = await withOrigin(request(app).post('/api/auth/check-email'))
      .set('Cookie', cookie || '')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'not-an-email' });

    expect(res.status).not.toBe(403);
  });
});

describe('isOriginAllowed (S-06)', () => {
  it('allows configured production origins', () => {
    expect(isOriginAllowed('https://siriartsandcrafts.com')).toBe(true);
  });

  it('rejects arbitrary origins', () => {
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });
});
