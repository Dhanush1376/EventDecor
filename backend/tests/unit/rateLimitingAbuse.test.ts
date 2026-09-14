import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRateLimiter,
  accountKeyGenerator,
  skipRateLimit,
} from '../../src/middleware/rateLimiter';
import logger from '../../src/config/logger';

type MockRes = {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
  setHeader: (key: string, val: string) => void;
};

const makeRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
    setHeader(key: string, val: string) {
      res.headers[key.toLowerCase()] = val;
    },
  };
  return res;
};

const makeReq = (overrides: Record<string, any> = {}) => ({
  method: 'POST',
  path: '/api/v1/auth/login',
  originalUrl: '/api/v1/auth/login',
  url: '/api/v1/auth/login',
  ip: '203.0.113.195',
  socket: { remoteAddress: '203.0.113.195' },
  headers: {},
  app: { get: vi.fn().mockReturnValue(false) },
  get: vi.fn().mockReturnValue('TestAgent/1.0'),
  ...overrides,
});

describe('Rate Limiting & Abuse Prevention Specification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Threshold Enforcement & 429 Response', () => {
    it('Allows requests under the limit and returns 429 once limit is exceeded', async () => {
      process.env.TEST_RATE_LIMIT = 'true';
      const limiter = createRateLimiter(
        'testAuthLimiter',
        {
          windowMs: 60 * 1000,
          limit: 3,
          validate: false,
        },
        true, // force memory store for unit testing
      );

      const runRequest = async () => {
        const req = makeReq();
        const res = makeRes();
        let nextCalled = false;
        await limiter(req as any, res as any, () => {
          nextCalled = true;
        });
        return { res, nextCalled };
      };

      // Requests 1, 2, 3 should pass through
      const r1 = await runRequest();
      expect(r1.nextCalled).toBe(true);

      const r2 = await runRequest();
      expect(r2.nextCalled).toBe(true);

      const r3 = await runRequest();
      expect(r3.nextCalled).toBe(true);

      // Request 4 should be throttled
      const r4 = await runRequest();
      expect(r4.nextCalled).toBe(false);
      expect(r4.res.statusCode).toBe(429);
      expect(r4.res.body.success).toBe(false);
      expect(r4.res.body.message).toMatch(/too many requests/i);
      expect(r4.res.headers['retry-after']).toBeDefined();
    });
  });

  describe('2. Abuse Logging & Telemetry', () => {
    it('Logs [ABUSE_DETECTED] with client IP and request metadata when throttled', async () => {
      const loggerSpy = vi.spyOn(logger, 'warn');
      const limiter = createRateLimiter(
        'paymentAbuseLimiter',
        {
          windowMs: 60 * 1000,
          limit: 1,
          validate: false,
        },
        true,
      );

      // Send requests until throttled (since TEST_RATE_LIMIT may set limit to 3)
      let throttledRes: MockRes | null = null;
      for (let i = 0; i < 5; i++) {
        const req = makeReq({ ip: '198.51.100.42', path: '/api/v1/payments/verify' });
        const res = makeRes();
        await limiter(req as any, res as any, () => {});
        if (res.statusCode === 429) {
          throttledRes = res;
          break;
        }
      }

      expect(throttledRes).not.toBeNull();
      expect(throttledRes?.statusCode).toBe(429);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ABUSE_DETECTED] Rate limit exceeded for limiter: paymentAbuseLimiter',
        ),
        expect.objectContaining({
          ip: '198.51.100.42',
        }),
      );
    });
  });

  describe('3. Key Generation & Account Partitioning', () => {
    it('Partitions limits by user ID for authenticated requests to prevent IP collusion', () => {
      const reqWithUser = makeReq({
        user: { id: 'usr_abc123' },
        ip: '192.0.2.1',
      });
      const key = accountKeyGenerator(reqWithUser as any, makeRes() as any);
      expect(key).toBe('user_usr_abc123');
    });

    it('Falls back to IP address for unauthenticated requests', () => {
      const reqAnon = makeReq({
        ip: '198.51.100.88',
      });
      const key = accountKeyGenerator(reqAnon as any, makeRes() as any);
      expect(key).toBe('198.51.100.88');
    });
  });

  describe('4. Health Check Bypass', () => {
    it('Skips rate limiting for monitoring and health endpoints', () => {
      delete process.env.TEST_RATE_LIMIT;
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const healthReq = makeReq({ path: '/api/v1/health', originalUrl: '/api/v1/health' });
      expect(skipRateLimit(healthReq as any)).toBe(true);

      const readinessReq = makeReq({ path: '/api/readiness', originalUrl: '/api/readiness' });
      expect(skipRateLimit(readinessReq as any)).toBe(true);

      const commerceReq = makeReq({
        path: '/api/v1/orders/checkout',
        originalUrl: '/api/v1/orders/checkout',
      });
      expect(skipRateLimit(commerceReq as any)).toBe(false);

      process.env.NODE_ENV = prevEnv;
    });
  });
});
