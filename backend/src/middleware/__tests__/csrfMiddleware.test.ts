import { describe, it, expect, vi } from 'vitest';
import { validateCsrf, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../csrfMiddleware';

type MockRes = {
  statusCode: number;
  body: any;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
};

const makeRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
};

const makeReq = (overrides: Record<string, any> = {}) => ({
  method: 'POST',
  path: '/api/v1/users/cart',
  originalUrl: '/api/v1/users/cart',
  cookies: {},
  headers: {},
  ...overrides,
});

describe('validateCsrf', () => {
  it('allows safe methods without any token', () => {
    const next = vi.fn();
    validateCsrf(makeReq({ method: 'GET' }) as any, makeRes() as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows exact-match exempt auth routes', () => {
    const next = vi.fn();
    validateCsrf(
      makeReq({ path: '/auth/refresh', originalUrl: '/api/v1/auth/refresh' }) as any,
      makeRes() as any,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('does NOT exempt routes that merely end with an exempt suffix', () => {
    const next = vi.fn();
    const res = makeRes();
    validateCsrf(
      makeReq({
        path: '/reviews/auth/refresh',
        originalUrl: '/api/v1/reviews/auth/refresh',
      }) as any,
      res as any,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('accepts a matching double-submit cookie + header pair', () => {
    const token = 'a'.repeat(64);
    const next = vi.fn();
    validateCsrf(
      makeReq({
        cookies: { [CSRF_COOKIE_NAME]: token },
        headers: { [CSRF_HEADER_NAME]: token },
      }) as any,
      makeRes() as any,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('rejects a mismatched token pair for cookie-authenticated requests', () => {
    const next = vi.fn();
    const res = makeRes();
    validateCsrf(
      makeReq({
        cookies: { [CSRF_COOKIE_NAME]: 'a'.repeat(64) },
        headers: { [CSRF_HEADER_NAME]: 'b'.repeat(64) },
      }) as any,
      res as any,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body?.success).toBe(false);
  });

  it('rejects mutating requests with no token at all', () => {
    const next = vi.fn();
    const res = makeRes();
    validateCsrf(makeReq() as any, res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('allows Bearer-token requests without an Origin header (non-browser clients)', () => {
    const next = vi.fn();
    validateCsrf(
      makeReq({ headers: { authorization: 'Bearer some.jwt.token' } }) as any,
      makeRes() as any,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('rejects Bearer-token requests from a disallowed Origin', () => {
    const next = vi.fn();
    const res = makeRes();
    validateCsrf(
      makeReq({
        headers: {
          authorization: 'Bearer some.jwt.token',
          origin: 'https://evil.example.com',
        },
      }) as any,
      res as any,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
