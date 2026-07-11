import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { canonicalizeEmail } from '../utils/email/emailHelper';
import SessionAuthService from './SessionAuthService';
import { getFrontendUrl } from '../utils/getFrontendUrl';

const getGoogleClient = (() => {
  let client: OAuth2Client | null = null;
  return () => {
    if (!client) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new ApiError(500, 'Google OAuth is not configured on this server');
      }
      client = new OAuth2Client(clientId);
    }
    return client;
  };
})();

interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

class GoogleAuthService {
  /**
   * Verify the Google ID token server-side against Google's public keys.
   * Returns the verified user profile or throws on invalid/expired tokens.
   */
  static async verifyIdToken(credential: string): Promise<GoogleProfile> {
    const client = getGoogleClient();
    const clientId = process.env.GOOGLE_CLIENT_ID!;

    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new ApiError(401, 'Invalid Google credential: empty payload');
      }

      // SECURITY: Only accept verified email addresses
      if (!payload.email_verified) {
        logger.warn(`[GOOGLE AUTH] Rejected unverified email: ${payload.email}`);
        throw new ApiError(401, 'Google email is not verified. Please verify your Google account.');
      }

      if (!payload.email) {
        throw new ApiError(401, 'Google account has no email address');
      }

      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture || '',
        googleId: payload.sub,
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      logger.error('[GOOGLE AUTH] Token verification failed:', err?.message || err);
      throw new ApiError(401, 'Google authentication failed. Please try again.');
    }
  }

  /**
   * Core authentication + account linking logic.
   *
   * CRITICAL DEDUPLICATION RULE:
   * - Email is the single source of truth for identity.
   * - If a user with that email exists (from OTP or any provider), we link the
   *   Google provider to the SAME account. No new user is created.
   * - If no user exists, we create a new one.
   * - Uses atomic findOneAndUpdate to prevent race-condition duplicates.
   */
  static async authenticateWithGoogle(
    credential: string,
    ip: string = '127.0.0.1',
    userAgent: string = '',
  ) {
    const profile = await this.verifyIdToken(credential);
    const cleanEmail = canonicalizeEmail(profile.email);

    logger.info(`[GOOGLE AUTH] Authentication requested for ${cleanEmail}`);

    // ── Step 1: Pre-flight Conflict Resolution ──
    // If another account holds this googleId but has a different email, we detach it.
    // Email is the ultimate source of truth. The new verified email takes ownership.
    await User.updateOne(
      { googleId: profile.googleId, email: { $ne: cleanEmail } },
      { $unset: { googleId: 1 }, $pull: { providers: 'google' } },
    );

    // ── Step 2: Atomic Upsert ──
    const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
    const defaultAvatar =
      profile.picture || `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;

    let user = await User.findOneAndUpdate(
      { email: cleanEmail },
      {
        $setOnInsert: {
          name: profile.name || cleanEmail.split('@')[0],
          role: 'customer',
          avatar: defaultAvatar,
          wishlist: [],
          cart: [],
          recentlyViewed: [],
          notificationPreferences: { email: true, marketing: true },
          accountPreferences: { theme: 'light', language: 'en' },
        },
        $set: {
          googleId: profile.googleId,
          lastLogin: new Date(),
          isVerified: true,
        },
        $addToSet: { providers: 'google' },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      throw new ApiError(500, 'Failed to authenticate and link Google account');
    }

    // Determine if this was a brand new account (upserted) by comparing timestamps.
    // Mongoose sets both exactly the same on an upsert.
    const isNewUser =
      user.createdAt && user.updatedAt && user.createdAt.getTime() === user.updatedAt.getTime();

    if (isNewUser) {
      logger.info(`[GOOGLE AUTH] No existing account for ${cleanEmail}. Created new user.`);
    } else {
      logger.info(
        `[GOOGLE AUTH] Existing account found for ${cleanEmail} (id: ${user._id}). Updated Google provider.`,
      );

      // Update name/avatar only if they are still auto-generated defaults
      const updates: Record<string, any> = {};
      const isDefaultName =
        !user.name ||
        user.name === 'Customer' ||
        user.name === cleanEmail.split('@')[0] ||
        user.name ===
          cleanEmail.split('@')[0].charAt(0).toUpperCase() + cleanEmail.split('@')[0].slice(1);

      if (isDefaultName && profile.name) {
        updates.name = profile.name;
      }

      const isDefaultAvatar = !user.avatar || user.avatar.includes('gravatar.com/avatar');
      if (isDefaultAvatar && profile.picture) {
        updates.avatar = profile.picture;
      }

      if (Object.keys(updates).length > 0) {
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: updates },
          { new: true },
        );
        if (!updatedUser) {
          throw new ApiError(500, 'Failed to update existing user profile');
        }
        user = updatedUser;
      }
    }

    // ── Post-login: New user onboarding (same as OTP flow) ──
    if (isNewUser) {
      try {
        const { RuleEngine } = require('./RuleEngine');
        await RuleEngine.evaluateTrigger('on_signup', { user });
      } catch (ruleErr) {
        logger.error('Failed to evaluate signup rules:', ruleErr);
      }

      try {
        const { createAdminNotification } = require('../controllers/adminNotificationController');
        createAdminNotification({
          title: 'New User Registration (Google)',
          message: `${user.name || user.email} registered via Google OAuth.`,
          type: 'user',
          actionLink: '/admin/users',
        }).catch((err: any) => {
          logger.error('Failed to create admin notification for Google registration:', err);
        });
      } catch (notifErr) {
        logger.error('Failed to create admin notification for Google registration:', notifErr);
      }

      try {
        const { sendDirectEmail } = require('./notificationService');
        const frontendUrl = getFrontendUrl();
        sendDirectEmail({
          email: user.email,
          subject: `Welcome to Siri Arts & Crafts, ${user.name} ✦ Discover Timeless Decor`,
          templateName: 'Welcome Email',
          templateData: {
            name: user.name,
            frontend_url: frontendUrl,
          },
          type: 'marketing',
          action: 'welcome_email',
          userId: user._id.toString(),
        }).catch((err: any) => logger.error('Failed to send welcome email in background:', err));
      } catch (welcomeErr) {
        logger.error('Failed to initiate welcome email dispatch:', welcomeErr);
      }
    }

    // ── Security alert email ──
    try {
      const { sendDirectEmail } = require('./notificationService');
      sendDirectEmail({
        email: user.email,
        subject: 'Security Alert: New Login Detected ✦ Siri Arts & Crafts',
        templateName: 'Suspicious Login Alert',
        templateData: {
          name: user.name,
          loginTime: new Date().toLocaleString(),
          deviceInfo: `Google OAuth from ${ip}`,
        },
        type: 'security',
        action: 'new_login_detected',
        userId: user._id.toString(),
      });
    } catch (err) {
      logger.error('Failed to trigger login alert email:', err);
    }

    // ── 2FA check (same as OTP flow) ──
    const userWith2fa = await User.findById(user._id).select('+twoFactorEnabled');
    if (userWith2fa?.twoFactorEnabled) {
      const { setTwoFactorPending } = require('../utils/security/twoFactorPending');
      await setTwoFactorPending(user._id.toString());
      return {
        requires2FA: true as const,
        user: userWith2fa.toObject(),
        refreshToken: '',
        accessToken: '',
      };
    }

    // ── Create session (JWT + refresh token) ──
    const session = await SessionAuthService.createSession(user, userAgent);
    logger.info(`[GOOGLE AUTH] Session created for user ${user._id} (${cleanEmail})`);

    return session;
  }
}

export default GoogleAuthService;
