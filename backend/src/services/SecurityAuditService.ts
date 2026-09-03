import crypto from 'crypto';
import SecurityAuditLog, { ISecurityAuditLog } from '../models/SecurityAuditLog';
import logger from '../config/logger';

export type SecurityEventType = ISecurityAuditLog['eventType'];

export class SecurityAuditService {
  static hashIdentifier(identifier: string): string {
    return crypto.createHash('sha256').update(identifier.toLowerCase().trim()).digest('hex');
  }

  static async log(event: {
    userId?: string;
    eventType: SecurityEventType;
    success: boolean;
    ip: string;
    userAgent: string;
    provider?: string;
    identifier?: string;
    challengeId?: string;
    reason?: string;
  }): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days

      await SecurityAuditLog.create({
        userId: event.userId,
        eventType: event.eventType,
        success: event.success,
        ip: event.ip,
        userAgent: event.userAgent,
        metadata: {
          provider: event.provider,
          identifierHash: event.identifier ? this.hashIdentifier(event.identifier) : undefined,
          challengeId: event.challengeId,
          reason: event.reason,
        },
        expiresAt,
      });
    } catch (error: any) {
      // Fire-and-forget logging. We log internally but never throw to disrupt the auth flow.
      logger.error(
        `[SECURITY_AUDIT_LOG_ERROR] Failed to save security audit log: ${error.message}`,
      );
    }
  }
}
