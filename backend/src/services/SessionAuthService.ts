import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';
import UsedRefreshToken from '../models/UsedRefreshToken';
import User from '../models/User';
import { IUser } from '../types/user';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

class SessionAuthService {
  static generateAccessToken(user: IUser) {
    return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });
  }

  static hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static getRefreshTokenTtlMs() {
    const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
  }

  static async createSession(user: IUser, userAgent: string = '') {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    // Create a new session document (supports multiple sessions per user)
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      userAgent,
    });

    // Enforce a maximum of 10 active sessions per user (evict oldest)
    const sessionCount = await RefreshToken.countDocuments({ userId: user._id });
    if (sessionCount > 10) {
      const oldest = await RefreshToken.find({ userId: user._id })
        .sort({ createdAt: 1 })
        .limit(sessionCount - 10)
        .select('_id');
      await RefreshToken.deleteMany({ _id: { $in: oldest.map((s) => s._id) } });
    }

    return { user, token: accessToken, accessToken, refreshToken };
  }

  static async refreshSession(refreshToken: string, userAgent: string = '') {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh session is missing');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    logger.info(
      `[DEBUG] refreshSession called with refreshToken=${refreshToken.substring(0, 10)}... Hash=${tokenHash}`,
    );

    // 1. Detect if this token was already used (Replay attack detection)
    const isUsed = await UsedRefreshToken.findOne({ tokenHash });
    if (isUsed) {
      const timeSinceUsedMs = Date.now() - (isUsed as any).createdAt.getTime();
      const GRACE_PERIOD_MS = 15000;

      if (timeSinceUsedMs < GRACE_PERIOD_MS) {
        logger.warn(
          `[AUTH] Grace period overlap detected for userId: ${isUsed.userId}. Returning 409 Conflict without revoking sessions.`,
        );
        throw new ApiError(409, 'Session refreshed concurrently in another tab.');
      }

      // Replay detected outside grace period — revoke entire refresh-token family (RFC 6749 rotation)
      logger.error(
        `[SECURITY ALERT] Refresh token reuse detected for userId: ${isUsed.userId}! Revoking all sessions. Potential token theft.`,
      );
      await RefreshToken.deleteMany({ userId: isUsed.userId }, {
        bypassDestructionGuard: true,
      } as any);
      await UsedRefreshToken.deleteMany({ userId: isUsed.userId }, {
        bypassDestructionGuard: true,
      } as any);
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    // 2. Find the session in the RefreshToken collection
    const session = await RefreshToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      logger.warn(`[DEBUG] Refresh session NOT FOUND or EXPIRED for Hash=${tokenHash}`);
      throw new ApiError(401, 'Refresh session is invalid or expired');
    }

    // 3. Verify the user exists and is active
    const user = await User.findOne({ _id: session.userId, isVerified: true });
    if (!user) {
      await RefreshToken.deleteOne({ _id: session._id });
      throw new ApiError(401, 'User account not found or not verified');
    }

    // 4. Record old refresh token as spent/used (for replay detection)
    try {
      await UsedRefreshToken.create({
        tokenHash,
        userId: user._id,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent || userAgent,
      });
    } catch (err: any) {
      if (err.name === 'MongoServerError' && err.code === 11000) {
        throw new ApiError(401, 'Session expired or refresh conflict. Please log in again.');
      }
      throw err;
    }

    // 5. Delete the old session document
    await RefreshToken.deleteOne({ _id: session._id });

    // 6. Create a fresh session (generates new access & rotated refresh token)
    return this.createSession(user, userAgent || session.userAgent || '');
  }

  static async revokeSession(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = this.hashRefreshToken(refreshToken);
    // Only delete the specific session document
    await RefreshToken.deleteOne({ tokenHash });
  }

  static async revokeAllSessions(userId: string) {
    await RefreshToken.deleteMany({ userId }, { bypassDestructionGuard: true } as any);
    await UsedRefreshToken.deleteMany({ userId }, { bypassDestructionGuard: true } as any);
  }
}

export default SessionAuthService;
