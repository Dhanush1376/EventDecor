import SessionAuthService from '../services/SessionAuthService';
import RefreshToken from '../models/RefreshToken';
import UsedRefreshToken from '../models/UsedRefreshToken';
import User from '../models/User';
import jwt from 'jsonwebtoken';

jest.mock('../models/RefreshToken');
jest.mock('../models/UsedRefreshToken');
jest.mock('../models/User');

describe('SessionAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret_key_123';
  });

  describe('createSession', () => {
    it('creates a new session and generates tokens', async () => {
      const mockUser = { _id: 'user_1', role: 'customer', email: 'test@example.com' } as any;
      (RefreshToken.create as jest.Mock).mockResolvedValue(true);
      (RefreshToken.countDocuments as jest.Mock).mockResolvedValue(5);

      const session = await SessionAuthService.createSession(mockUser, 'Mozilla TestAgent');

      expect(session).toHaveProperty('accessToken');
      expect(session).toHaveProperty('refreshToken');
      expect(RefreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user_1', userAgent: 'Mozilla TestAgent' }),
      );

      const decoded = jwt.verify(session.accessToken, 'test_secret_key_123') as any;
      expect(decoded.email).toBe('test@example.com');
    });

    it('enforces maximum 10 sessions by deleting oldest', async () => {
      const mockUser = { _id: 'user_1' } as any;
      (RefreshToken.countDocuments as jest.Mock).mockResolvedValue(12); // 12 existing

      const mockOldest = [{ _id: 'sess1' }, { _id: 'sess2' }];
      (RefreshToken.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockOldest),
          }),
        }),
      });

      await SessionAuthService.createSession(mockUser);

      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ['sess1', 'sess2'] },
      });
    });
  });

  describe('refreshSession', () => {
    it('throws error if refresh token is missing', async () => {
      await expect(SessionAuthService.refreshSession('', 'Agent')).rejects.toThrow(
        'Refresh session is missing',
      );
    });

    it('detects replay attack within grace period', async () => {
      const mockUsed = { userId: 'user_1', createdAt: new Date() }; // Very recent
      (UsedRefreshToken.findOne as jest.Mock).mockResolvedValue(mockUsed);

      await expect(SessionAuthService.refreshSession('old_token', 'Agent')).rejects.toThrow(
        'Session refreshed concurrently in another tab',
      );
      expect(RefreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('detects replay attack outside grace period and revokes family', async () => {
      const pastDate = new Date(Date.now() - 30000); // 30s ago (outside grace)
      const mockUsed = { userId: 'user_1', createdAt: pastDate };
      (UsedRefreshToken.findOne as jest.Mock).mockResolvedValue(mockUsed);

      await expect(SessionAuthService.refreshSession('old_token', 'Agent')).rejects.toThrow(
        'Session expired. Please log in again.',
      );

      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId: 'user_1' });
      expect(UsedRefreshToken.deleteMany).toHaveBeenCalledWith({ userId: 'user_1' });
    });

    it('successfully rotates session', async () => {
      (UsedRefreshToken.findOne as jest.Mock).mockResolvedValue(null);

      const mockSession = {
        _id: 'sess_1',
        userId: 'user_1',
        expiresAt: new Date(Date.now() + 10000),
      };
      (RefreshToken.findOne as jest.Mock).mockResolvedValue(mockSession);

      const mockUser = { _id: 'user_1', isVerified: true, email: 't@t.com' };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      (UsedRefreshToken.create as jest.Mock).mockResolvedValue(true);
      (RefreshToken.deleteOne as jest.Mock).mockResolvedValue(true);
      (RefreshToken.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await SessionAuthService.refreshSession('valid_token', 'Agent');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(UsedRefreshToken.create).toHaveBeenCalled(); // Mark old as used
      expect(RefreshToken.deleteOne).toHaveBeenCalledWith({ _id: 'sess_1' }); // Delete old
    });
  });

  describe('revokeSession', () => {
    it('revokes specific session', async () => {
      await SessionAuthService.revokeSession('some_token');
      expect(RefreshToken.deleteOne).toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    it('revokes all sessions for a user', async () => {
      await SessionAuthService.revokeAllSessions('user_1');
      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId: 'user_1' });
      expect(UsedRefreshToken.deleteMany).toHaveBeenCalledWith({ userId: 'user_1' });
    });
  });
});
