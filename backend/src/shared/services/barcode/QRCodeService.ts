import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import logger from '../../../config/logger';

const QR_SECRET = process.env.QR_SECRET_KEY || 'default_fallback_qr_secret_change_in_production';

export class QRCodeService {
  /**
   * Generates a signed QR Code payload for a Product (Stable, No Expiry)
   */
  static generateProductQrPayload(productUuid: string, sku: string): string {
    return jwt.sign(
      {
        type: 'product',
        productUuid,
        sku,
      },
      QR_SECRET,
      { algorithm: 'HS256' }, // No expiresIn for products
    );
  }

  /**
   * Generates a signed QR Code payload for a Package (Stable, No Expiry)
   */
  static generatePackageQrPayload(packageId: string, orderId: string): string {
    return jwt.sign(
      {
        type: 'package',
        packageId,
        orderId,
      },
      QR_SECRET,
      { algorithm: 'HS256' },
    );
  }

  /**
   * Generates a signed QR Code payload for an Operational Task (Time-bound)
   * e.g., Picklist assignment for a worker
   */
  static generateOperationalQrPayload(
    action: string,
    entityId: string,
    expiresIn: string = '12h',
  ): string {
    return jwt.sign(
      {
        type: 'operational',
        action,
        entityId,
      },
      QR_SECRET,
      { expiresIn: expiresIn as any, algorithm: 'HS256' },
    );
  }

  /**
   * Generates a QR Code as a PNG Buffer
   */
  static async generateQrBuffer(payload: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(payload, {
        errorCorrectionLevel: 'H',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error: any) {
      logger.error('Error generating QR code buffer:', error.message);
      throw error;
    }
  }

  /**
   * Generates a QR Code as a Base64 string
   */
  static async generateQrBase64(payload: string): Promise<string> {
    try {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error: any) {
      logger.error('Error generating QR code base64:', error.message);
      throw error;
    }
  }
}
