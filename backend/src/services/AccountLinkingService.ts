import mongoose from 'mongoose';
import User from '../models/User';
import AuthIdentity from '../models/AuthIdentity';
import OtpChallenge from '../models/OtpChallenge';
import ApiError from '../utils/ApiError';
import { PhoneAuthService } from './PhoneAuthService';
import GoogleAuthService from './GoogleAuthService';
import { SecurityAuditService } from './SecurityAuditService';
import { getSmsProvider } from './SmsProviderService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class AccountLinkingService {
  static maskIdentifier(provider: string, identifier: string): string {
    if (provider === 'email') {
      const [local, domain] = identifier.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }
    if (provider === 'phone') {
      return `${identifier.slice(0, 3)} ****${identifier.slice(-4)}`;
    }
    return identifier; // Google etc.
  }

  static async linkGoogle(userId: string, credential: string, recentAuthAt: Date, ip: string) {
    if (Date.now() - recentAuthAt.getTime() > 5 * 60 * 1000) {
      throw new ApiError(403, 'Please re-authenticate before making security changes.');
    }

    const profile = await GoogleAuthService.verifyIdToken(credential);

    const existing = await AuthIdentity.findOne({
      provider: 'google',
      providerSubjectId: profile.googleId,
    });

    if (existing && existing.userId.toString() !== userId) {
      SecurityAuditService.log({
        eventType: 'ACCOUNT_LINK_CONFLICT',
        success: false,
        ip,
        userAgent: 'unknown',
        provider: 'google',
        reason: 'already_linked_to_other_account',
      });
      throw new ApiError(409, 'This Google account is already connected to another account.');
    }
    if (existing && existing.userId.toString() === userId) {
      return { alreadyLinked: true };
    }

    try {
      await AuthIdentity.create({
        userId,
        provider: 'google',
        providerSubjectId: profile.googleId,
        verifiedAt: new Date(),
        metadata: { displayName: profile.name, avatar: profile.picture, email: profile.email },
      });
    } catch (err: any) {
      if (err.name === 'MongoServerError' && err.code === 11000) {
        SecurityAuditService.log({
          eventType: 'ACCOUNT_LINK_CONFLICT',
          success: false,
          ip,
          userAgent: 'unknown',
          provider: 'google',
          reason: 'duplicate_key_error',
        });
        throw new ApiError(409, 'This Google account is already connected to another account.');
      }
      throw err;
    }

    SecurityAuditService.log({
      userId,
      eventType: 'ACCOUNT_LINK_SUCCESS',
      success: true,
      ip,
      userAgent: 'unknown',
      provider: 'google',
    });
  }

  static async requestPhoneLink(userId: string, phone: string, recentAuthAt: Date, ip: string) {
    if (Date.now() - recentAuthAt.getTime() > 5 * 60 * 1000) {
      throw new ApiError(403, 'Please re-authenticate before making security changes.');
    }

    const normalizedPhone = PhoneAuthService.normalizePhone(phone);

    const existing = await AuthIdentity.findOne({
      provider: 'phone',
      providerSubjectId: normalizedPhone,
    });

    if (existing && existing.userId.toString() !== userId) {
      throw new ApiError(409, 'This phone number is already connected to another account.');
    }
    if (existing && existing.userId.toString() === userId) {
      throw new ApiError(400, 'This phone number is already connected to your account.');
    }

    const purpose = 'LINK_PHONE';

    // Anti-abuse limits (Layer 3 & 5)
    const recentChallenge = await OtpChallenge.findOne({
      identifier: normalizedPhone,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 30 * 1000) }, // 30 sec cooldown
    });
    if (recentChallenge) {
      throw new ApiError(429, 'Please wait before requesting another code');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const challengeId = crypto.randomUUID();

    await OtpChallenge.updateMany(
      { identifier: normalizedPhone, purpose, exhausted: false, consumedAt: null },
      { $set: { exhausted: true } },
    );

    await OtpChallenge.create({
      challengeId,
      purpose,
      identifier: normalizedPhone,
      identifierType: 'phone',
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    getSmsProvider()
      .sendOtp(normalizedPhone, otp)
      .catch(() => {});

    SecurityAuditService.log({
      userId,
      eventType: 'OTP_REQUESTED',
      success: true,
      ip,
      userAgent: 'unknown',
      identifier: normalizedPhone,
      challengeId,
    });

    return { challengeId };
  }

  static async verifyPhoneLink(userId: string, challengeId: string, otp: string, ip: string) {
    const challenge = await OtpChallenge.findOne({ challengeId });
    if (!challenge || challenge.purpose !== 'LINK_PHONE') {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (challenge.exhausted || challenge.consumedAt || challenge.expiresAt < new Date()) {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.exhausted = true;
      await challenge.save();
      throw new ApiError(400, 'Too many failed attempts. Please request a new code.');
    }

    challenge.attempts += 1;

    const isMatch = await bcrypt.compare(otp, challenge.otpHash);
    if (!isMatch) {
      if (challenge.attempts >= challenge.maxAttempts) challenge.exhausted = true;
      await challenge.save();
      throw new ApiError(400, 'Invalid verification code');
    }

    challenge.consumedAt = new Date();
    await challenge.save();

    await OtpChallenge.updateMany(
      { identifier: challenge.identifier, purpose: challenge.purpose, _id: { $ne: challenge._id } },
      { $set: { exhausted: true } },
    );

    const normalizedPhone = challenge.identifier;

    try {
      await mongoose.connection.transaction(async (txSession) => {
        await AuthIdentity.create(
          [
            {
              userId,
              provider: 'phone',
              providerSubjectId: normalizedPhone,
              verifiedAt: new Date(),
            },
          ],
          { session: txSession },
        );

        await User.findByIdAndUpdate(userId, { phone: normalizedPhone }, { session: txSession });
      });
    } catch (err: any) {
      if (err.name === 'MongoServerError' && err.code === 11000) {
        throw new ApiError(409, 'This phone number is already connected to another account.');
      }
      throw err;
    }

    SecurityAuditService.log({
      userId,
      eventType: 'ACCOUNT_LINK_SUCCESS',
      success: true,
      ip,
      userAgent: 'unknown',
      provider: 'phone',
    });
  }

  static async unlinkProvider(
    userId: string,
    provider: 'email' | 'phone' | 'google',
    recentAuthAt: Date,
    ip: string,
  ) {
    if (Date.now() - recentAuthAt.getTime() > 5 * 60 * 1000) {
      throw new ApiError(403, 'Please re-authenticate before making security changes.');
    }

    const count = await AuthIdentity.countDocuments({ userId });
    if (count <= 1) {
      SecurityAuditService.log({
        userId,
        eventType: 'ACCOUNT_UNLINK_BLOCKED',
        success: false,
        ip,
        userAgent: 'unknown',
        provider,
        reason: 'last_login_method',
      });
      throw new ApiError(
        400,
        'Cannot remove your only login method. Add another login method first.',
      );
    }

    await mongoose.connection.transaction(async (txSession) => {
      await AuthIdentity.findOneAndDelete({ userId, provider }).session(txSession);

      if (provider === 'phone') {
        await User.findByIdAndUpdate(userId, { $unset: { phone: 1 } }, { session: txSession });
      }
      // Note: We don't unset email currently as it is the primary contact method
    });

    SecurityAuditService.log({
      userId,
      eventType: 'ACCOUNT_UNLINK_SUCCESS',
      success: true,
      ip,
      userAgent: 'unknown',
      provider,
    });
  }

  static async getLinkedProviders(userId: string) {
    const identities = await AuthIdentity.find({ userId })
      .select('provider providerSubjectId verifiedAt metadata')
      .lean();

    return identities.map((id) => {
      let displayIdentifier = this.maskIdentifier(id.provider, id.providerSubjectId);
      if (id.provider === 'google') {
        if (id.metadata?.email) {
          displayIdentifier = id.metadata.email;
        } else if (id.metadata?.displayName) {
          displayIdentifier = id.metadata.displayName;
        }
      }

      return {
        provider: id.provider,
        identifier: displayIdentifier,
        displayName: id.metadata?.displayName,
        verifiedAt: id.verifiedAt,
      };
    });
  }
}
