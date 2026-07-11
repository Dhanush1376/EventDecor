import AdminAuditLog from '../models/AdminAuditLog';
import logger from '../config/logger';

interface AuditLogParams {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: any;
  newValue?: any;
}

/**
 * AdminAuditService — Centralized service for logging admin actions with entity-level tracking.
 *
 * Replaces the generic HTTP-only audit middleware for admin mutations.
 * Records WHAT changed (previous value → new value), not just that an HTTP request was made.
 */
export class AdminAuditService {
  /**
   * Logs an admin action with full entity context and change tracking.
   */
  static async logAction(params: AuditLogParams): Promise<void> {
    try {
      // Auto-compute diff if both previousValue and newValue provided
      let changes: Record<string, { previous: any; new: any }> | undefined;
      if (
        params.previousValue &&
        params.newValue &&
        typeof params.previousValue === 'object' &&
        typeof params.newValue === 'object'
      ) {
        changes = {};
        const allKeys = new Set([
          ...Object.keys(params.previousValue),
          ...Object.keys(params.newValue),
        ]);
        for (const key of allKeys) {
          const prev = params.previousValue[key];
          const next = params.newValue[key];
          if (JSON.stringify(prev) !== JSON.stringify(next)) {
            changes[key] = { previous: prev, new: next };
          }
        }
        // If no differences found, don't store an empty object
        if (Object.keys(changes).length === 0) {
          changes = undefined;
        }
      }

      await AdminAuditLog.create({
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole || 'admin',
        method: params.method || 'PATCH',
        path: params.path || `/api/admin/${params.entityType.toLowerCase()}/${params.entityId}`,
        statusCode: params.statusCode || 200,
        ip: params.ip,
        userAgent: params.userAgent,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes,
        previousValue: params.previousValue,
        newValue: params.newValue,
      });
    } catch (err: any) {
      // Audit logging should never break the request — log and continue
      logger.error(`[ADMIN AUDIT] Failed to log action: ${err.message}`, {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
      });
    }
  }

  /**
   * Convenience method for logging order status changes.
   */
  static async logOrderStatusChange(
    actorId: string,
    actorEmail: string,
    orderId: string,
    previousStatus: string,
    newStatus: string,
    note?: string,
  ): Promise<void> {
    await this.logAction({
      actorId,
      actorEmail,
      entityType: 'Order',
      entityId: orderId,
      action: 'status_update',
      previousValue: { orderStatus: previousStatus },
      newValue: { orderStatus: newStatus, note },
    });
  }

  /**
   * Convenience method for logging booking status changes.
   */
  static async logBookingStatusChange(
    actorId: string,
    actorEmail: string,
    bookingId: string,
    previousStatus: string,
    newStatus: string,
    note?: string,
  ): Promise<void> {
    await this.logAction({
      actorId,
      actorEmail,
      entityType: 'EventJob',
      entityId: bookingId,
      action: 'status_update',
      previousValue: { status: previousStatus },
      newValue: { status: newStatus, note },
    });
  }

  /**
   * Convenience method for logging rental status changes.
   */
  static async logRentalStatusChange(
    actorId: string,
    actorEmail: string,
    rentalId: string,
    previousStatus: string,
    newStatus: string,
    note?: string,
  ): Promise<void> {
    await this.logAction({
      actorId,
      actorEmail,
      entityType: 'RentalOrder',
      entityId: rentalId,
      action: 'status_update',
      previousValue: { status: previousStatus },
      newValue: { status: newStatus, note },
    });
  }

  /**
   * Convenience method for logging custom order status changes.
   */
  static async logCustomOrderStatusChange(
    actorId: string,
    actorEmail: string,
    customOrderId: string,
    previousStatus: string,
    newStatus: string,
    note?: string,
  ): Promise<void> {
    await this.logAction({
      actorId,
      actorEmail,
      entityType: 'CustomOrder',
      entityId: customOrderId,
      action: 'status_update',
      previousValue: { status: previousStatus },
      newValue: { status: newStatus, note },
    });
  }
}
