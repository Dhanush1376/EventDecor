import crypto from 'crypto';
import { Transform } from 'stream';
import logger from '../../config/logger';
import EncryptionKeyHistory from '../../models/EncryptionKeyHistory';
import BackupAuditLog from '../../models/BackupAuditLog';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export interface EncryptStreamResult {
  stream: Transform;
  iv: string;
  keyVersion: string;
}

export interface DecryptStreamResult {
  stream: Transform;
}

export interface SignatureResult {
  signatureHex: string;
  publicKeyId: string;
  signedAt: Date;
}

export class EncryptionService {
  /**
   * Derives a 32-byte key from the environment variable passphrase
   */
  private static deriveKey(passphrase: string): Buffer {
    // In a real production system, use PBKDF2 with a salt, or just require a 32-byte hex string in env
    // We'll hash it to ensure it's exactly 32 bytes for AES-256
    return crypto.createHash('sha256').update(passphrase).digest();
  }

  /**
   * Gets the active encryption key and its version
   */
  public static async getActiveKey(): Promise<{ key: Buffer; version: string }> {
    const keyString = process.env.BACKUP_ENCRYPTION_KEY;
    if (!keyString) {
      throw new Error('BACKUP_ENCRYPTION_KEY environment variable is not set');
    }

    // Attempt to find active key in DB, if not found or DB unavailable, default to 'v1'
    let version = 'v1';
    try {
      const activeKeyRec = await EncryptionKeyHistory.findOne({ status: 'active' });
      if (activeKeyRec) {
        version = activeKeyRec.keyId;
      }
    } catch (e: any) {
      logger.warn(`Could not fetch active key version, defaulting to v1: ${e.message}`);
    }

    return {
      key: this.deriveKey(keyString),
      version,
    };
  }

  /**
   * Gets a specific key by version
   */
  public static async getKeyForVersion(version: string): Promise<Buffer> {
    if (version === 'v1') {
      const keyString = process.env.BACKUP_ENCRYPTION_KEY;
      if (!keyString) throw new Error('BACKUP_ENCRYPTION_KEY environment variable is not set');
      return this.deriveKey(keyString);
    }

    // Look for versioned env var like BACKUP_ENCRYPTION_KEY_V2
    const envVarName = `BACKUP_ENCRYPTION_KEY_${version.toUpperCase()}`;
    const versionedKey = process.env[envVarName];
    if (versionedKey) {
      return this.deriveKey(versionedKey);
    }

    // Fallback
    throw new Error(`Encryption key for version ${version} not found in environment`);
  }

  /**
   * Creates a stream that encrypts data as it passes through
   */
  public static async createEncryptStream(): Promise<EncryptStreamResult> {
    const { key, version } = await this.getActiveKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // We can't return authTag immediately because it's only available after the stream ends.
    // In Node.js streams, the caller needs to wait for the stream to finish, then call cipher.getAuthTag()
    // To handle this cleanly in a pipeline, we'll wrap it.

    const transformStream = new Transform({
      transform(chunk, encoding, callback) {
        try {
          const encrypted = cipher.update(chunk);
          if (encrypted.length > 0) {
            this.push(encrypted);
          }
          callback();
        } catch (err: any) {
          callback(err);
        }
      },
      flush(callback) {
        try {
          const final = cipher.final();
          if (final.length > 0) {
            this.push(final);
          }
          // The auth tag must be appended to the end of the stream or returned out-of-band.
          // Since we need to store it in DB, we'll emit it as an event that the orchestrator can listen to.
          const authTag = cipher.getAuthTag();
          this.emit('authTag', authTag.toString('hex'));
          callback();
        } catch (err: any) {
          callback(err);
        }
      },
    });

    return {
      stream: transformStream,
      iv: iv.toString('hex'),
      keyVersion: version,
    };
  }

  /**
   * Creates a stream that decrypts data as it passes through
   */
  public static async createDecryptStream(
    ivHex: string,
    authTagHex: string,
    keyVersion: string,
  ): Promise<DecryptStreamResult> {
    const key = await this.getKeyForVersion(keyVersion);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const transformStream = new Transform({
      transform(chunk, encoding, callback) {
        try {
          const decrypted = decipher.update(chunk);
          if (decrypted.length > 0) {
            this.push(decrypted);
          }
          callback();
        } catch (err: any) {
          callback(err);
        }
      },
      flush(callback) {
        try {
          const final = decipher.final();
          if (final.length > 0) {
            this.push(final);
          }
          callback();
        } catch (err: any) {
          callback(err); // This will throw if auth tag verification fails
        }
      },
    });

    return {
      stream: transformStream,
    };
  }

  /**
   * Signs a checksum to prove it was generated by this system
   */
  public static signBackup(checksumHex: string): SignatureResult {
    // In production, you would use a real private key. For this implementation,
    // we'll use HMAC with a signing key.
    const signingKey =
      process.env.BACKUP_SIGNING_KEY || process.env.BACKUP_ENCRYPTION_KEY || 'default-signing-key';

    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(checksumHex);
    const signatureHex = hmac.digest('hex');

    return {
      signatureHex,
      publicKeyId: 'v1',
      signedAt: new Date(),
    };
  }

  /**
   * Verifies a digital signature
   */
  public static verifySignature(
    checksumHex: string,
    signatureHex: string,
    _publicKeyId: string,
  ): { valid: boolean; reason?: string } {
    const expected = this.signBackup(checksumHex);

    if (expected.signatureHex !== signatureHex) {
      return { valid: false, reason: 'Signature mismatch. Backup may have been tampered with.' };
    }

    return { valid: true };
  }

  /**
   * Validates key presence and strength on startup
   */
  public static async validateKeysOnStartup(): Promise<void> {
    const keyString = process.env.BACKUP_ENCRYPTION_KEY;
    if (!keyString) {
      logger.warn('[SECURITY] BACKUP_ENCRYPTION_KEY is missing. Backups will fail.');
      return;
    }
    if (keyString.length < 32) {
      logger.warn(
        '[SECURITY] BACKUP_ENCRYPTION_KEY is less than 32 characters. Consider generating a stronger key.',
      );
    }

    try {
      // Ensure we have at least one record in EncryptionKeyHistory
      const activeKey = await EncryptionKeyHistory.findOne({ status: 'active' });
      if (!activeKey) {
        const fingerprint = crypto
          .createHash('sha256')
          .update(this.deriveKey(keyString))
          .digest('hex');
        await EncryptionKeyHistory.create({
          keyId: 'v1',
          algorithm: ALGORITHM,
          keyFingerprint: fingerprint,
          status: 'active',
          activatedAt: new Date(),
        });
        logger.info('[SECURITY] Initialized encryption key history (v1)');
      }
    } catch (e: any) {
      logger.error(`[SECURITY] Failed to validate key history: ${e.message}`);
    }
  }

  /**
   * Manual key rotation trigger
   */
  public static async rotateKey(newVersion: string, adminId: string): Promise<void> {
    logger.info(`[SECURITY] Rotating encryption key to ${newVersion}`);

    // Deactivate current
    await EncryptionKeyHistory.updateMany(
      { status: 'active' },
      {
        $set: {
          status: 'retired',
          retiredAt: new Date(),
          retirementReason: 'manual',
        },
      },
    );

    // Create new (assuming the env var is already updated)
    const envVarName = `BACKUP_ENCRYPTION_KEY_${newVersion.toUpperCase()}`;
    const newKeyString = process.env[envVarName] || process.env.BACKUP_ENCRYPTION_KEY;

    if (!newKeyString) {
      throw new Error(`New key not found in environment variables.`);
    }

    const fingerprint = crypto
      .createHash('sha256')
      .update(this.deriveKey(newKeyString))
      .digest('hex');

    await EncryptionKeyHistory.create({
      keyId: newVersion,
      algorithm: ALGORITHM,
      keyFingerprint: fingerprint,
      status: 'active',
      activatedAt: new Date(),
    });

    await BackupAuditLog.create({
      action: 'key_rotated',
      performedBy: adminId,
      details: { newVersion },
    });
  }
}
