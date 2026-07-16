import { Request } from 'express';
import WhatsAppAuditLog from '../../../models/WhatsAppAuditLog';
import logger from '../../../config/logger';

export class WhatsAppAuditService {
  /**
   * Logs a mutation action.
   */
  static async logChange(
    entityType: 'template' | 'automation' | 'recipient' | 'config',
    entityId: string,
    action:
      | 'create'
      | 'update'
      | 'delete'
      | 'toggle'
      | 'publish'
      | 'rollback'
      | 'approve'
      | 'reject',
    previousValue: any,
    newValue: any,
    req?: Request,
    changeDescription?: string,
    rollbackTargetId?: string,
  ): Promise<void> {
    try {
      let performedBy;
      let ipAddress;
      let userAgent;

      if (req) {
        performedBy = (req as any).user?._id;
        ipAddress = req.ip || req.headers['x-forwarded-for'];
        userAgent = req.headers['user-agent'];
      }

      await WhatsAppAuditLog.create({
        entityType,
        entityId,
        action,
        previousValue,
        newValue,
        performedBy,
        ipAddress,
        userAgent,
        changeDescription,
        rollbackTargetId,
      });
    } catch (error) {
      logger.error(
        `[WhatsAppAuditService] Failed to log change for ${entityType} ${entityId}`,
        error,
      );
    }
  }

  /**
   * Retrieves audit trail for a specific entity.
   */
  static async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50,
    skip: number = 0,
  ) {
    return await WhatsAppAuditLog.find({ entityType, entityId })
      .sort({ performedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'name email');
  }

  /**
   * Retrieves a specific audit log by ID.
   */
  static async getAuditLog(logId: string) {
    return await WhatsAppAuditLog.findById(logId).populate('performedBy', 'name email');
  }
}
