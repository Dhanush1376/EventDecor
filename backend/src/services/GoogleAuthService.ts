import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User';
import AuthIdentity from '../models/AuthIdentity';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { canonicalizeEmail } from '../utils/email/emailHelper';
import SessionAuthService from './SessionAuthService';
import { getFrontendUrl } from '../utils/getFrontendUrl';
import { SecurityAuditService } from './SecurityAuditService';
import { RuleEngine } from './RuleEngine';
import { createAdminNotification, sendDirectEmail } from './notificationService';

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
  email_verified: boolean;
}

class GoogleAuthService {
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
        email_verified: payload.email_verified,
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      logger.error('[GOOGLE AUTH] Token verification failed:', err?.message || err);
      throw new ApiError(401, 'Google authentication failed. Please try again.');
    }
  }

  static async authenticateWithGoogle(
    credential: string,
    ip: string = '127.0.0.1',
    userAgent: string = '',
  ) {
    const profile = await this.verifyIdToken(credential);
    const cleanEmail = canonicalizeEmail(profile.email);

    // 1. AUTHENTICATION RESOLUTION — AuthIdentity is the sole authority
    const googleIdentity = await AuthIdentity.findOne({
      provider: 'google',
      providerSubjectId: profile.googleId,
    });

    // CASE A: Google identity already linked → login that user
    if (googleIdentity) {
      const user = await User.findById(googleIdentity.userId);
      if (!user || !user.isVerified) {
        throw new ApiError(401, 'Authentication failed. Please try again.');
      }

      // 2FA check
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

      const session = await SessionAuthService.createSession(user, userAgent);

      SecurityAuditService.log({
        userId: user._id.toString(),
        eventType: 'GOOGLE_AUTH_SUCCESS',
        success: true,
        ip,
        userAgent,
        provider: 'google',
      });

      return session;
    }

    // CASE B: Google identity NOT linked to any user
    // Check if Google's email matches an existing user account
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      // Auto-link the Google account since Google has verified the email
      await AuthIdentity.create({
        userId: existingUser._id,
        provider: 'google',
        providerSubjectId: profile.googleId,
        verifiedAt: new Date(),
        metadata: { displayName: profile.name, avatar: profile.picture, email: profile.email },
      });

      // 2FA check
      const userWith2fa = await User.findById(existingUser._id).select('+twoFactorEnabled');
      if (userWith2fa?.twoFactorEnabled) {
        const { setTwoFactorPending } = require('../utils/security/twoFactorPending');
        await setTwoFactorPending(existingUser._id.toString());
        return {
          requires2FA: true as const,
          user: userWith2fa.toObject(),
          refreshToken: '',
          accessToken: '',
        };
      }

      const session = await SessionAuthService.createSession(existingUser, userAgent);

      SecurityAuditService.log({
        userId: existingUser._id.toString(),
        eventType: 'GOOGLE_AUTH_SUCCESS',
        success: true,
        ip,
        userAgent,
        provider: 'google',
      });

      return session;
    }

    // CASE C: Completely new identity → create new account
    const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
    const defaultAvatar =
      profile.picture || `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;

    let createdUser: any;

    const session = await mongoose.connection.transaction(async (txSession) => {
      const user = new User({
        name: profile.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'customer',
        isVerified: true,
        avatar: defaultAvatar,
        wishlist: [],
        cart: [],
        recentlyViewed: [],
        notificationPreferences: { email: true, marketing: true },
        accountPreferences: { theme: 'light', language: 'en' },
      });
      await user.save({ session: txSession });
      createdUser = user;

      await AuthIdentity.create(
        [
          {
            userId: user._id,
            provider: 'google',
            providerSubjectId: profile.googleId,
            verifiedAt: new Date(),
            metadata: { displayName: profile.name, avatar: profile.picture, email: profile.email },
          },
        ],
        { session: txSession },
      );

      // Create email identity from Google's verified email
      await AuthIdentity.create(
        [
          {
            userId: user._id,
            provider: 'email',
            providerSubjectId: cleanEmail,
            verifiedAt: new Date(),
          },
        ],
        { session: txSession },
      );

      return await SessionAuthService.createSession(user, userAgent);
    });

    SecurityAuditService.log({
      userId: createdUser._id.toString(),
      eventType: 'SIGNUP_SUCCESS',
      success: true,
      ip,
      userAgent,
      provider: 'google',
    });

    // Post-login triggers
    try {
      await RuleEngine.evaluateTrigger('on_signup', { user: createdUser });
    } catch (ruleErr) {
      logger.error('Failed to evaluate signup rules:', ruleErr);
    }

    try {
      createAdminNotification({
        title: 'New User Registration (Google)',
        message: `${createdUser.name || createdUser.email} registered via Google OAuth.`,
        type: 'user',
        actionLink: '/admin/users',
      }).catch((err: any) => logger.error('Failed to create admin notification:', err));
    } catch (notifErr) {
      logger.error('Failed to create admin notification for Google registration:', notifErr);
    }

    try {
      const frontendUrl = getFrontendUrl();
      sendDirectEmail({
        email: createdUser.email,
        subject: `Welcome to Siri Arts & Crafts, ${createdUser.name}`,
        templateName: 'Welcome Email',
        templateData: {
          name: createdUser.name,
          frontend_url: frontendUrl,
        },
        type: 'marketing',
        action: 'welcome_email',
        userId: createdUser._id.toString(),
      });
    } catch (welcomeErr) {
      logger.error('Failed to initiate welcome email dispatch:', welcomeErr);
    }

    return Object.assign(session, { isNewUser: true });
  }
}

export default GoogleAuthService;
