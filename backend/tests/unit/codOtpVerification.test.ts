import '../integration/setup';
import { describe, it, expect, vi } from 'vitest';
import OtpAuthService from '../../src/services/OtpAuthService';
import OtpChallenge from '../../src/models/OtpChallenge';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/services/notificationService', () => ({
  sendDirectEmailProcessor: vi.fn().mockResolvedValue({ success: true }),
  sendDirectEmail: vi.fn().mockResolvedValue({ success: true }),
  createAdminNotification: vi.fn().mockResolvedValue(true),
}));

describe('COD OTP Verification', () => {
  it('generates and verifies COD OTP using email identifier', async () => {
    const testEmail = `cod_test_${Date.now()}@example.com`;
    await OtpAuthService.generateCodOTP(testEmail);

    const challenge = await OtpChallenge.findOne({
      identifier: testEmail,
      purpose: 'COD_VERIFICATION',
    }).sort({ createdAt: -1 });
    expect(challenge).toBeTruthy();

    const devLog = fs.readFileSync(path.resolve(process.cwd(), '.dev-otp-log'), 'utf8');
    const match = devLog.match(new RegExp(`To: ${testEmail} \\| COD OTP: (\\d{6})`));
    expect(match).toBeTruthy();
    const otp = match![1];

    // Invalid OTP fails with 400
    await expect(OtpAuthService.verifyCodOTP(testEmail, '000000')).rejects.toThrow();

    // Correct OTP succeeds
    const verified = await OtpAuthService.verifyCodOTP(testEmail, otp);
    expect(verified).toBe(true);
  });
});
