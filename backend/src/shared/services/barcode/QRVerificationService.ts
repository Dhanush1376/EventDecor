import jwt from 'jsonwebtoken';
import logger from '../../../config/logger';

const QR_SECRET = process.env.QR_SECRET_KEY || 'default_fallback_qr_secret_change_in_production';

export interface QRPayload {
  type: 'product' | 'package' | 'operational';
  [key: string]: any;
}

export class QRVerificationService {
  /**
   * Verifies a signed QR payload. Throws if invalid or expired.
   */
  static verifyQrPayload(payload: string): QRPayload {
    try {
      const decoded = jwt.verify(payload, QR_SECRET) as QRPayload;
      return decoded;
    } catch (error: any) {
      logger.warn(`QR Verification failed: ${error.message}`);
      throw new Error(`Invalid or expired QR code: ${error.message}`, { cause: error });
    }
  }

  /**
   * Safe verify that returns null instead of throwing
   */
  static safeVerifyQrPayload(payload: string): QRPayload | null {
    try {
      return this.verifyQrPayload(payload);
    } catch (_e) {
      return null;
    }
  }
}
