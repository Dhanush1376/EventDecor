import User from '../models/User';
import ApiError from '../utils/ApiError';
import { decryptField } from '../utils/security/fieldEncryption';
import { generateTotpSecret, buildOtpAuthUrl, verifyTotpToken } from '../utils/security/totp';

export class TwoFactorService {
  static async getStatus(userId: string) {
    const user = await User.findById(userId).select('+twoFactorEnabled');
    if (!user) throw new ApiError(404, 'User not found');
    return { enabled: !!user.twoFactorEnabled };
  }

  /** Returns a new secret + otpauth URL (not enabled until verified). */
  static async beginSetup(userId: string) {
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorEnabled');
    if (!user) throw new ApiError(404, 'User not found');
    if (user.twoFactorEnabled) throw new ApiError(400, '2FA is already enabled');

    const secret = generateTotpSecret();
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = false;
    await user.save();

    return {
      secret,
      otpauthUrl: buildOtpAuthUrl(user.email, secret),
    };
  }

  static async enable(userId: string, token: string) {
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorEnabled');
    if (!user) throw new ApiError(404, 'User not found');
    if (!user.twoFactorSecret) throw new ApiError(400, 'Run 2FA setup first');

    const secret = decryptField(user.twoFactorSecret);
    if (!verifyTotpToken(secret, token)) {
      throw new ApiError(400, 'Invalid authenticator code');
    }

    user.twoFactorEnabled = true;
    await user.save();
    return { enabled: true };
  }

  static async disable(userId: string, token: string) {
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorEnabled');
    if (!user) throw new ApiError(404, 'User not found');
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ApiError(400, '2FA is not enabled');
    }

    const secret = decryptField(user.twoFactorSecret);
    if (!verifyTotpToken(secret, token)) {
      throw new ApiError(400, 'Invalid authenticator code');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    return { enabled: false };
  }

  static async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorEnabled');
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return false;
    const secret = decryptField(user.twoFactorSecret);
    return verifyTotpToken(secret, token);
  }
}
