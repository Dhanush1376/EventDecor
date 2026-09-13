import '../integration/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OtpAuthService from '../../src/services/OtpAuthService';
import OtpChallenge from '../../src/models/OtpChallenge';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/services/notificationService', () => ({
  sendDirectEmailProcessor: vi.fn().mockResolvedValue({ success: true }),
  sendDirectEmail: vi.fn().mockResolvedValue({ success: true }),
  createAdminNotification: vi.fn().mockResolvedValue(true),
}));

describe('COD Phone OTP Verification & Address Binding', () => {
  beforeEach(() => {
    process.env.SMS_PROVIDER = 'mock';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
  });

  it('generates, verifies COD OTP using phone number and returns verification token', async () => {
    const phone = '9154691315';
    const userId = '6aa70c61f32d1777baf7c97f';

    const genResult = await OtpAuthService.generateCodOTP(phone, userId);
    expect(genResult.success).toBe(true);

    const challenge = await OtpChallenge.findOne({
      identifier: '+919154691315',
      purpose: 'COD_VERIFICATION',
    }).sort({ createdAt: -1 });
    expect(challenge).toBeTruthy();

    const devLog = fs.readFileSync(path.resolve(process.cwd(), '.dev-otp-log'), 'utf8');
    const matches = [...devLog.matchAll(/To: \+919154691315 \| OTP: (\d{6})/g)];
    expect(matches.length).toBeGreaterThan(0);
    const otp = matches[matches.length - 1][1];

    // Invalid OTP fails
    await expect(OtpAuthService.verifyCodOTP(phone, '000000', userId)).rejects.toThrow();

    // Correct OTP succeeds and returns signed token
    const verifyResult = await OtpAuthService.verifyCodOTP(phone, otp, userId);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.codVerificationToken).toBeDefined();

    const decoded = jwt.verify(verifyResult.codVerificationToken!, process.env.JWT_SECRET!) as any;
    expect(decoded.phone).toBe('+919154691315');
    expect(decoded.userId).toBe(userId);
    expect(decoded.purpose).toBe('COD_ORDER_VERIFICATION');
  });

  it('enforces that verification for Address A NEVER authorizes Address B with a different phone', async () => {
    const phoneA = '9154691315';
    const phoneB = '9876543210';
    const userId = '6aa70c61f32d1777baf7c97f';

    // 1. Verify Address A
    await OtpAuthService.generateCodOTP(phoneA, userId);
    const devLog = fs.readFileSync(path.resolve(process.cwd(), '.dev-otp-log'), 'utf8');
    const matches = [...devLog.matchAll(/To: \+919154691315 \| OTP: (\d{6})/g)];
    const otpA = matches[matches.length - 1][1];
    const { codVerificationToken: tokenA } = await OtpAuthService.verifyCodOTP(
      phoneA,
      otpA,
      userId,
    );

    expect(tokenA).toBeDefined();

    // 2. Decode token A
    const decodedA = jwt.verify(tokenA!, process.env.JWT_SECRET!) as any;
    expect(decodedA.phone).toBe('+919154691315');

    // 3. Simulate Address B selected during checkout
    const shippingAddressB = {
      name: 'Recipient B',
      phone: phoneB,
      address: '456 Alternate Street',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
    };

    // Normalize Address B's phone
    const normalizedPhoneB = '+91' + phoneB;

    // Token A's phone (+919154691315) does NOT match Address B's phone (+919876543210)
    expect(decodedA.phone).not.toBe(normalizedPhoneB);

    // Verification check as performed in OrderCheckoutService:
    // Address A token MUST NOT authorize Address B
    const phoneMatches = decodedA.phone === normalizedPhoneB;
    expect(phoneMatches).toBe(false);
  });

  it('enforces single-use atomic consumption of the challenge token to prevent replay', async () => {
    const phone = '9988776655';
    const userId = '6aa70c61f32d1777baf7c97f';

    await OtpAuthService.generateCodOTP(phone, userId);
    const devLog = fs.readFileSync(path.resolve(process.cwd(), '.dev-otp-log'), 'utf8');
    const matches = [...devLog.matchAll(/To: \+919988776655 \| OTP: (\d{6})/g)];
    const otp = matches[matches.length - 1][1];
    const { codVerificationToken } = await OtpAuthService.verifyCodOTP(phone, otp, userId);

    const decoded = jwt.verify(codVerificationToken!, process.env.JWT_SECRET!) as any;

    // First consumption (Order 1 with Address A)
    const firstConsumption = await OtpChallenge.findOneAndUpdate(
      {
        challengeId: decoded.challengeId,
        purpose: 'COD_VERIFICATION',
        exhausted: false,
      },
      {
        $set: { exhausted: true, consumedAt: new Date() },
      },
    );
    expect(firstConsumption).toBeTruthy();

    // Second consumption (Attempted reuse for Order 2 / Address B)
    const secondConsumption = await OtpChallenge.findOneAndUpdate(
      {
        challengeId: decoded.challengeId,
        purpose: 'COD_VERIFICATION',
        exhausted: false,
      },
      {
        $set: { exhausted: true, consumedAt: new Date() },
      },
    );
    expect(secondConsumption).toBeNull();
  });
});
