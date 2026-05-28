process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_chars';

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/AdminInvite', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../utils/safetyLockCache', () => ({
  __esModule: true,
  getSafetyLockDocument: jest.fn(async () => ({ data: { safetyLock: false } })),
  invalidateSafetyLockCache: jest.fn(async () => {}),
}));

jest.mock('../middleware/csrfMiddleware', () => ({
  __esModule: true,
  validateCsrf: (req: any, res: any, next: any) => next(),
  issueCsrfToken: (req: any, res: any) => res.status(200).json({ success: true, csrfToken: 'test-token' }),
  clearCsrfCookie: jest.fn(),
  regenerateCsrfToken: jest.fn(() => 'test-token'),
}));

import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import AdminInvite from '../models/AdminInvite';

const mockUserFindOne = User.findOne as jest.Mock;
const mockUserFindById = User.findById as jest.Mock;
const mockAdminInviteCreate = AdminInvite.create as jest.Mock;
const mockAdminInviteFindOne = AdminInvite.findOne as jest.Mock;

const createMockQuery = (resolvedValue: any) => {
  const query = {
    select: jest.fn().mockImplementation(() => query),
    lean: jest.fn().mockImplementation(() => query),
    exec: jest.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    then: (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(resolvedValue).catch(reject),
  };
  return query as any;
};

describe('Admin Access Invitation & Approval System', () => {
  let superAdminToken: string;
  let moderatorToken: string;
  let customerToken: string;

  beforeAll(() => {
    superAdminToken = jwt.sign(
      { id: 'super_admin_id', role: 'super_admin', email: 'super@siriartsandcrafts.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    moderatorToken = jwt.sign(
      { id: 'moderator_id', role: 'moderator', email: 'mod@siriartsandcrafts.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    customerToken = jwt.sign(
      { id: 'customer_id', role: 'customer', email: 'cust@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock user resolve for auth checks
    mockUserFindById.mockImplementation((id) => {
      const roleMap: Record<string, string> = {
        super_admin_id: 'super_admin',
        moderator_id: 'moderator',
        customer_id: 'customer'
      };
      return createMockQuery({
        _id: id,
        id,
        role: roleMap[id] || 'customer',
        email: 'user@example.com',
        isVerified: true,
      });
    });
  });

  describe('POST /api/v1/admin/invites (Create Invite)', () => {
    it('rejects invitation if actor is not super admin or owner', async () => {
      const res = await request(app)
        .post('/api/v1/admin/invites')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ email: 'target@example.com', role: 'admin' });

      expect(res.status).toBe(403);
    });

    it('rejects invitation if target user is not registered', async () => {
      mockUserFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/admin/invites')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'unregistered@example.com', role: 'admin' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/registered/i);
    });

    it('prevents self-role invitation/escalation', async () => {
      mockUserFindOne.mockResolvedValue({
        _id: 'super_admin_id',
        email: 'super@siriartsandcrafts.com',
        role: 'super_admin'
      });

      const res = await request(app)
        .post('/api/v1/admin/invites')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'super@siriartsandcrafts.com', role: 'owner' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/self/i);
    });

    it('rejects invitation if actor tries to assign a role equal/higher than their own', async () => {
      mockUserFindOne.mockResolvedValue({
        _id: 'target_id',
        email: 'target@example.com',
        role: 'customer'
      });

      const res = await request(app)
        .post('/api/v1/admin/invites')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'target@example.com', role: 'super_admin' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('succeeds and creates invitation if validations pass', async () => {
      mockUserFindOne.mockResolvedValue({
        _id: 'target_id',
        email: 'target@example.com',
        role: 'customer'
      });
      mockAdminInviteFindOne.mockResolvedValue(null);
      mockAdminInviteCreate.mockResolvedValue({
        _id: 'invite_id',
        email: 'target@example.com',
        roleAssigned: 'admin',
        status: 'pending'
      });

      const res = await request(app)
        .post('/api/v1/admin/invites')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'target@example.com', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAdminInviteCreate).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/admin/invites/respond', () => {
    it('accepts and upgrades user role', async () => {
      const mockInvite = {
        _id: 'invite_id',
        invitedUser: 'customer_id',
        roleAssigned: 'admin',
        status: 'pending',
        save: jest.fn()
      };
      mockAdminInviteFindOne.mockResolvedValue(mockInvite);

      const mockSaveUser = jest.fn();
      mockUserFindById.mockImplementation((id) => {
        if (id === 'customer_id') {
          return createMockQuery({
            _id: 'customer_id',
            role: 'customer',
            email: 'cust@example.com',
            isVerified: true,
            save: mockSaveUser
          });
        }
        return createMockQuery({
          _id: id,
          role: 'customer',
          email: 'user@example.com',
          isVerified: true
        });
      });

      const res = await request(app)
        .post('/api/v1/admin/invites/respond')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ inviteId: 'invite_id', action: 'accept' });

      expect(res.status).toBe(200);
      expect(mockSaveUser).toHaveBeenCalled();
      expect(mockInvite.status).toBe('accepted');
    });

    it('rejects invitation without upgrading user role', async () => {
      const mockInvite = {
        _id: 'invite_id',
        invitedUser: 'customer_id',
        roleAssigned: 'admin',
        status: 'pending',
        save: jest.fn()
      };
      mockAdminInviteFindOne.mockResolvedValue(mockInvite);

      const res = await request(app)
        .post('/api/v1/admin/invites/respond')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ inviteId: 'invite_id', action: 'reject' });

      expect(res.status).toBe(200);
      expect(mockInvite.status).toBe('rejected');
    });
  });
});
