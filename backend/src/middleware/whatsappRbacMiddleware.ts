import { Request, Response, NextFunction } from 'express';
import WhatsAppRoleMap from '../models/WhatsAppRoleMap';
import { WhatsAppApprovalService } from '../domains/notifications/whatsapp/WhatsAppApprovalService';
import logger from '../config/logger';

/**
 * Enterprise RBAC Middleware for WhatsApp Module.
 * Checks permissions and natively intercepts restricted actions to the Approval Workflow.
 */
export const requireWhatsAppPermission = (permission: string, actionTitle?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as any;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Bypass RBAC for super admins and admins in case of emergency (or define a SuperAdmin System Role)
      if (['super_admin', 'main_admin', 'admin'].includes(user.role)) {
        return next();
      }

      const roleMap = await WhatsAppRoleMap.findOne({ userId: user._id }).populate('roleId');
      if (!roleMap || !roleMap.roleId) {
        res
          .status(403)
          .json({ success: false, error: 'No WhatsApp Role assigned. Access Denied.' });
        return;
      }

      const role = roleMap.roleId as any;

      // 1. Check if user has the base permission (e.g. they can view or initiate the action)
      if (!role.permissions.includes(permission)) {
        res
          .status(403)
          .json({ success: false, error: `Missing required permission: ${permission}` });
        return;
      }

      // 2. Check if the action requires Approval (Four-Eyes Principle interceptor)
      // E.g., user has 'campaigns:write' but role.requiresApprovalFor includes 'campaigns:execute'
      // We look to see if this specific route is flagged for their role.
      if (role.requiresApprovalFor.includes(permission)) {
        // Intercept execution and create an Approval Request instead
        const title = actionTitle || `Execute ${permission}`;

        await WhatsAppApprovalService.createApprovalRequest(
          user._id,
          title,
          permission,
          req.originalUrl,
          req.method,
          req.body,
        );

        // Return 202 Accepted, indicating workflow initiation
        res.status(202).json({
          success: true,
          message:
            'Action intercepted by RBAC. An Approval Request has been sent to a Senior Administrator.',
        });
        return;
      }

      // 3. User has permission and no approval required. Proceed.
      next();
    } catch (error: any) {
      logger.error('RBAC Middleware Error', error);
      res.status(500).json({ success: false, error: 'Internal RBAC Server Error' });
    }
  };
};
