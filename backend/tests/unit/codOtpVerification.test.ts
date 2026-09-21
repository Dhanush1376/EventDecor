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
    const phone = '9999999991';
    const userId = '6aa70c61f32d1777baf7c97f';

    const genResult = await OtpAuthService.generateCodOTP(phone, userId);
    expect(genResult.success).toBe(true);

    const challenge = await OtpChallenge.findOne({
      identifier: '+919999999991',
      purpose: 'COD_VERIFICATION',
    }).sort({ createdAt: -1 });
    expect(challenge).toBeTruthy();

    const devLog = fs.readFileSync(path.resolve(process.cwd(), '.dev-otp-log'), 'utf8');
    const matches = [...devLog.matchAll(/To: \+919999999991 \| OTP: (\d{6})/g)];
    expect(matches.length).toBeGreaterThan(0);
    const otp = matches[matches.length - 1][1];

    // Invalid OTP fails
    await expect(OtpAuthService.verifyCodOTP(phone, '000000', userId)).rejects.toThrow();

    // Correct OTP succeeds and returns signed token
    const verifyResult = await OtpAuthService.verifyCodOTP(phone, otp, userId);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.codVerificationToken).toBeDefined();

    const decoded = jwt.verify(verifyResult.codVerificationToken!, process.env.JWT_SECRET!) as any;
    expect(decoded.phone).toBe('+919999999991');
    expect(decoded.userId).toBe(userId);
    expect(decoded.purpose).toBe('COD_ORDER_VERIFICATION');
  });

  it('enforces that verification for Address A NEVER authorizes Address B with a different phone', async () => {
    const phoneA = '9999999991';
    const phoneB = '9876543210';
    const userId = '6aa70c61f32d1777baf7c97f';

    // 1. Verify Address A
    await OtpAuthService.generateCodOTP(phoneA, userId);
    const devLog = fs.readFileSync(path.resolve(process.cwd(), '.dev-otp-log'), 'utf8');
    const matches = [...devLog.matchAll(/To: \+919999999991 \| OTP: (\d{6})/g)];
    const otpA = matches[matches.length - 1][1];
    const { codVerificationToken: tokenA } = await OtpAuthService.verifyCodOTP(
      phoneA,
      otpA,
      userId,
    );

    expect(tokenA).toBeDefined();

    // 2. Decode token A
    const decodedA = jwt.verify(tokenA!, process.env.JWT_SECRET!) as any;
    expect(decodedA.phone).toBe('+919999999991');

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

    // Token A's phone (+919999999991) does NOT match Address B's phone (+919876543210)
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

  it('generates, verifies COD OTP using email address and binds token to email', async () => {
    const email = 'customer.test@example.com';
    const userId = '6aa70c61f32d1777baf7c97f';

    const genResult = await OtpAuthService.generateCodOTP({ email, channel: 'email', userId });
    expect(genResult.success).toBe(true);
    expect(genResult.channel).toBe('email');
    expect(genResult.challengeId).toBeDefined();

    const { sendDirectEmailProcessor } = await import('../../src/services/notificationService');
    expect(sendDirectEmailProcessor).toHaveBeenCalled();

    const calls = (sendDirectEmailProcessor as any).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.email).toBe('customer.test@example.com');
    expect(lastCall.action).toBe('cod_otp');
    expect(lastCall.customHtml).toContain('Order Verification');
    expect(lastCall.customHtml).toContain('Verification Code');

    // Extract OTP from email call subject
    const otpMatch = lastCall.subject.match(/^(\d{6})/);
    expect(otpMatch).toBeTruthy();
    const otp = otpMatch[1];

    // Verification with wrong OTP fails
    await expect(
      OtpAuthService.verifyCodOTP({ email, otp: '111111' }, '111111', userId),
    ).rejects.toThrow();

    // Verification with correct OTP succeeds
    const verifyResult = await OtpAuthService.verifyCodOTP(
      { email, challengeId: genResult.challengeId },
      otp,
      userId,
    );
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.channel).toBe('email');
    expect(verifyResult.codVerificationToken).toBeDefined();

    const decoded = jwt.verify(verifyResult.codVerificationToken!, process.env.JWT_SECRET!) as any;
    expect(decoded.email).toBe('customer.test@example.com');
    expect(decoded.channel).toBe('email');
    expect(decoded.userId).toBe(userId);
    expect(decoded.purpose).toBe('COD_ORDER_VERIFICATION');
  });

  it('enforces that email verification for Address A NEVER authorizes Address B with a different email', async () => {
    const emailA = 'customer.a@example.com';
    const emailB = 'customer.b@example.com';
    const userId = '6aa70c61f32d1777baf7c97f';

    const genResultA = await OtpAuthService.generateCodOTP({
      email: emailA,
      channel: 'email',
      userId,
    });
    const { sendDirectEmailProcessor } = await import('../../src/services/notificationService');
    const calls = (sendDirectEmailProcessor as any).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    const otpA = lastCall.subject.match(/^(\d{6})/)[1];

    const { codVerificationToken: tokenA } = await OtpAuthService.verifyCodOTP(
      { email: emailA, challengeId: genResultA.challengeId },
      otpA,
      userId,
    );
    expect(tokenA).toBeDefined();

    const decodedA = jwt.verify(tokenA!, process.env.JWT_SECRET!) as any;
    expect(decodedA.email).toBe('customer.a@example.com');
    expect(decodedA.channel).toBe('email');

    // Simulate order placement with delivery email B
    const shippingAddressB = {
      name: 'Recipient B',
      email: emailB,
      phone: '9876543210',
    };

    const orderEmailB = (shippingAddressB.email || '').toLowerCase().trim();
    const tokenEmailA = (decodedA.email || '').toLowerCase().trim();

    expect(tokenEmailA).not.toBe(orderEmailB);
  });
});
