import BackupAuditLog, { BackupAuditAction } from '../../models/BackupAuditLog';
import logger from '../../config/logger';

export class BackupAuditService {
  /**
   * Creates an immutable audit log entry
   */
  public static async log(
    action: BackupAuditAction,
    details: Record<string, any>,
    performedBy: string = 'system',
    backupId?: string,
  ): Promise<void> {
    try {
      await BackupAuditLog.create({
        action,
        performedBy,
        backupId,
        details,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
      });
      logger.info(
        `[AUDIT] ${action} performed by ${performedBy}${backupId ? ` on backup ${backupId}` : ''}`,
      );
    } catch (err: any) {
      logger.error(`[AUDIT] Failed to create audit log for ${action}: ${err.message}`);
    }
  }

  /**
   * Specialized logger for state machine transitions
   */
  public static async logStateTransition(
    backupId: string,
    from: string,
    to: string,
    reason: string = 'Pipeline progression',
  ): Promise<void> {
    try {
      await BackupAuditLog.create({
        action: 'state_transition',
        performedBy: 'system',
        backupId,
        details: {},
        stateTransition: { from, to, reason },
      });
      logger.info(`[STATE] Backup ${backupId} transitioned ${from} -> ${to}`);
    } catch (err: any) {
      logger.error(`[AUDIT] Failed to log state transition for ${backupId}: ${err.message}`);
    }
  }
}
