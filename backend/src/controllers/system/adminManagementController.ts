import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import PaymentWebhookEvent from '../../models/PaymentWebhookEvent';
import bcrypt from 'bcryptjs';
import { canonicalizeEmail } from '../../utils/email/emailHelper';
import { AdminAuditService } from '../../services/AdminAuditService';
import {
  isProtectedSuperAdminEmail,
  ADMIN_ROLES,
  canActorManageTarget,
  canActorAssignRole,
} from '../../config/adminConfig';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { setPaginationHeaders } from '../../utils/paginationHeaders';

/**
 * Get all administrators (Staff)
 * Protected by requireSuperAdmin
 */
export const getAdmins = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter = { role: { $in: ADMIN_ROLES } };

  const [admins, totalCount] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -twoFactorSecret')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  setPaginationHeaders(res, totalCount, page, limit);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Admins retrieved successfully',
        formatPaginationResponse(admins, totalCount, page, limit),
      ),
    );
});

/**
 * Add a new administrator
 * Protected by requireSuperAdmin
 */
export const addAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, role, password } = req.body;
  const actorRole = (req as any).user!.role;

  if (!name || !email || !role || !password) {
    throw new ApiError(400, 'Name, email, role, and temporary password are required');
  }

  // Enforce role assignment permissions
  if (!canActorAssignRole(actorRole, role)) {
    throw new ApiError(403, `You do not have permission to grant the role "${role}".`);
  }

  const cleanEmail = canonicalizeEmail(email);

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    if (['user', 'customer'].includes(existingUser.role)) {
      // Upgrade existing customer to admin
      const salt = await bcrypt.genSalt(12);
      existingUser.passwordHash = await bcrypt.hash(password, salt);
      existingUser.role = role;
      existingUser.passwordChangedAt = new Date();
      await existingUser.save();

      return res
        .status(200)
        .json(new ApiResponse(true, 'Existing user upgraded to admin', existingUser));
    }
    throw new ApiError(400, 'User with this email already exists and is an admin');
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const newAdmin = await User.create({
    name,
    email: cleanEmail,
    role,
    passwordHash,
    isVerified: true,
    passwordChangedAt: new Date(),
  });

  res.status(201).json(new ApiResponse(true, 'Admin created successfully', newAdmin));
});

/**
 * Update administrator role
 * Protected by requireSuperAdmin
 */
export const updateAdminRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const actorRole = (req as any).user!.role;
  const actorId = (req as any).user!.id;

  if (!role) {
    throw new ApiError(400, 'Role is required');
  }

  const admin = await User.findById(id);
  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  // Prevent self-role modification
  if (String(admin._id) === String(actorId)) {
    throw new ApiError(400, 'You cannot modify your own role.');
  }

  if (isProtectedSuperAdminEmail(admin.email)) {
    throw new ApiError(403, 'The primary Super Admin role cannot be changed');
  }

  // Verify actor can manage the target admin's current role
  if (!canActorManageTarget(actorRole, admin.role)) {
    throw new ApiError(
      403,
      `You do not have permission to manage this admin (Role: "${admin.role}").`,
    );
  }

  // Verify actor can assign the new role
  if (!canActorAssignRole(actorRole, role)) {
    throw new ApiError(403, `You do not have permission to assign the role "${role}".`);
  }

  const previousRole = admin.role;
  admin.role = role;
  await admin.save();

  const { AdminAuditService } = require('../../services/AdminAuditService');
  await AdminAuditService.logAction({
    actorId: req.user?.id,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    entityType: 'User',
    entityId: admin._id.toString(),
    action: 'update_role',
    previousValue: { role: previousRole },
    newValue: { role },
  });

  res.status(200).json(new ApiResponse(true, 'Admin role updated successfully', admin));
});

/**
 * Remove/Disable administrator
 * Protected by requireSuperAdmin
 */
export const removeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorRole = (req as any).user!.role;
  const actorId = (req as any).user!.id;

  const admin = await User.findById(id);
  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  // Prevent self-privilege revocation
  if (String(admin._id) === String(actorId)) {
    throw new ApiError(400, 'You cannot revoke your own admin privileges.');
  }

  if (isProtectedSuperAdminEmail(admin.email)) {
    throw new ApiError(403, 'The primary Super Admin cannot be removed');
  }

  // Verify actor can manage/revoke target user's role
  if (!canActorManageTarget(actorRole, admin.role)) {
    throw new ApiError(
      403,
      `You do not have permission to revoke privileges for this admin (Role: "${admin.role}").`,
    );
  }

  const previousRole = admin.role;
  admin.role = 'customer';
  admin.passwordHash = undefined;
  await admin.save();

  await AdminAuditService.logAction({
    actorId: req.user?.id,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    entityType: 'User',
    entityId: admin._id.toString(),
    action: 'revoke_admin',
    previousValue: { role: previousRole },
    newValue: { role: 'customer' },
  });

  res.status(200).json(new ApiResponse(true, 'Admin privileges revoked successfully', null));
});

/**
 * Fetch Dead Letter Queue Webhooks
 * Protected by requireSuperAdmin
 */
export const getDeadLetterWebhooks = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);

  // Allow filtering by status, default to both failed and dead_letter
  const statusFilter = req.query.status ? req.query.status : { $in: ['failed', 'dead_letter'] };
  const filter: any = { status: statusFilter };

  const [events, totalCount] = await Promise.all([
    PaymentWebhookEvent.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentWebhookEvent.countDocuments(filter),
  ]);

  setPaginationHeaders(res, totalCount, page, limit);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'DLQ webhooks retrieved',
        formatPaginationResponse(events, totalCount, page, limit),
      ),
    );
});

/**
 * Retry a DLQ webhook by resetting status to pending and re-enqueueing to webhookQueue
 * Protected by requireSuperAdmin
 */
export const retryDeadLetterWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await PaymentWebhookEvent.findById(id);
  if (!event) throw new ApiError(404, 'Webhook event not found');
  if (event.status !== 'dead_letter' && event.status !== 'failed') {
    throw new ApiError(400, 'Only failed or dead_letter webhooks can be retried');
  }

  // Reset status to pending
  const previousStatus = event.status;
  event.status = 'pending';
  event.processingAttempts = 0;
  event.errorLog = undefined;
  await event.save();

  // Re-enqueue into webhookQueue
  const { webhookQueue, isQueuesReady } = require('../../jobs/queues');
  if (isQueuesReady()) {
    await webhookQueue.add('processWebhook', { eventId: event.razorpayEventId });
  } else {
    // If BullMQ is down, fallback to memory queue
    const { webhookQueue: fallbackQueue } = require('../../services/webhookQueueService');
    if (fallbackQueue && typeof fallbackQueue.enqueue === 'function') {
      fallbackQueue.enqueue({ eventId: event.razorpayEventId });
    }
  }

  // Log audit
  const { AdminAuditService } = require('../../services/AdminAuditService');
  await AdminAuditService.logAction({
    actorId: (req as any).user?.id,
    actorEmail: (req as any).user?.email,
    actorRole: (req as any).user?.role,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    entityType: 'PaymentWebhookEvent',
    entityId: event._id.toString(),
    action: 'retry_dlq_webhook',
    previousValue: { status: previousStatus },
    newValue: { status: 'pending' },
  });

  res.status(200).json(new ApiResponse(true, 'Webhook re-enqueued successfully', event));
});
