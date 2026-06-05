import { validateCsrf, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../middleware/csrfMiddleware';
import crypto from 'crypto';

describe('CSRF Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      path: '/api/test',
      cookies: {},
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('allows safe methods unconditionally', () => {
    mockReq.method = 'GET';
    validateCsrf(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects mutating request without tokens', () => {
    validateCsrf(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('rejects if lengths do not match (prevents timing safe equal crash)', () => {
    mockReq.cookies[CSRF_COOKIE_NAME] = 'short';
    mockReq.headers[CSRF_HEADER_NAME] = 'longer_token_here';
    validateCsrf(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('accepts if tokens match exactly', () => {
    const token = crypto.randomBytes(32).toString('hex');
    mockReq.cookies[CSRF_COOKIE_NAME] = token;
    mockReq.headers[CSRF_HEADER_NAME] = token;
    validateCsrf(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects if tokens are same length but differ (timing safe check)', () => {
    const token1 = 'A'.repeat(64);
    const token2 = 'B'.repeat(64);
    mockReq.cookies[CSRF_COOKIE_NAME] = token1;
    mockReq.headers[CSRF_HEADER_NAME] = token2;
    validateCsrf(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});
