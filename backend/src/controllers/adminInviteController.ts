import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import User from '../models/User';
import AdminInvite from '../models/AdminInvite';
import logger from '../config/logger';
import { canonicalizeEmail } from '../utils/email/emailHelper';
import { canActorManageTarget, canActorAssignRole } from '../config/adminConfig';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { setPaginationHeaders } from '../utils/paginationHeaders';
import { invalidateUserSessionCaches } from '../utils/cache/userSessionCache';

/**
 * Invite an existing registered user to the Admin Portal
 * Protected by requireSuperAdminOrOwner
 */
export const createAdminInvite = asyncHandler(async (req: Request, res: Response) => {
  const { email, role, permissionsSummary } = req.body;
  const actorId = (req as any).user!.id;
  const actorRole = (req as any).user!.role;

  if (!email || !role) {
    throw new ApiError(400, 'Email and Role are required fields');
  }

  const cleanEmail = canonicalizeEmail(email);

  // 1. Resolve and validate the target user
  const targetUser = await User.findOne({ email: cleanEmail });
  if (!targetUser) {
    throw new ApiError(
      404,
      `No registered user found with email "${cleanEmail}". Admin access invitations can only be sent to existing registered accounts.`,
    );
  }

  // 2. Prevent self-invitation or self-privilege escalation
  if (String(targetUser._id) === String(actorId)) {
    throw new ApiError(
      400,
      'You cannot invite yourself to a role or escalate your own privileges.',
    );
  }

  // 3. Verify actor has permissions over target user's current role
  if (!canActorManageTarget(actorRole, targetUser.role)) {
    throw new ApiError(
      403,
      `You do not have permission to manage users with the role "${targetUser.role}".`,
    );
  }

  // 4. Verify actor can assign the requested role
  if (!canActorAssignRole(actorRole, role)) {
    throw new ApiError(403, `You do not have permission to grant the role "${role}".`);
  }

  // 5. Prevent duplicate invitations
  const existingPending = await AdminInvite.findOne({ email: cleanEmail, status: 'pending' });
  if (existingPending) {
    throw new ApiError(
      400,
      `A pending invitation to the role "${existingPending.roleAssigned}" already exists for this email.`,
    );
  }

  // 6. Create the invitation record
  const invite = await AdminInvite.create({
    email: cleanEmail,
    roleAssigned: role,
    permissionsSummary: permissionsSummary || 'Access Admin Portal & Dashboard',
    status: 'pending',
    invitedBy: actorId,
    invitedUser: targetUser._id,
  });

  logger.info(
    `[ADMIN INVITE] Invite created for user ${cleanEmail} (ID: ${targetUser._id}) as ${role} by actor ${actorId}`,
  );

  res.status(201).json(new ApiResponse(true, 'Admin invitation created successfully', invite));
});

/**
 * Get all pending invitations
 * Protected by requireSuperAdminOrOwner
 */
export const getPendingInvites = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);

  const [invites, totalCount] = await Promise.all([
    AdminInvite.find({ status: 'pending' })
      .populate('invitedBy', 'name email role')
      .populate('invitedUser', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AdminInvite.countDocuments({ status: 'pending' }),
  ]);

  setPaginationHeaders(res, totalCount, page, limit);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Pending invitations retrieved',
        formatPaginationResponse(invites, totalCount, page, limit),
      ),
    );
});

/**
 * Get all invitation history
 * Protected by requireSuperAdminOrOwner
 */
export const getInviteHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);

  const [invites, totalCount] = await Promise.all([
    AdminInvite.find()
      .populate('invitedBy', 'name email role')
      .populate('invitedUser', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AdminInvite.countDocuments(),
  ]);

  setPaginationHeaders(res, totalCount, page, limit);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Invitation history retrieved',
        formatPaginationResponse(invites, totalCount, page, limit),
      ),
    );
});

/**
 * Revoke an active pending invitation
 * Protected by requireSuperAdminOrOwner
 */
export const revokeAdminInvite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorRole = (req as any).user!.role;

  const invite = await AdminInvite.findById(id);
  if (!invite) {
    throw new ApiError(404, 'Invitation not found');
  }

  if (invite.status !== 'pending') {
    throw new ApiError(
      400,
      `Only pending invitations can be revoked. This invitation is currently "${invite.status}".`,
    );
  }

  // Verify actor has role clearance to revoke this role
  if (!canActorAssignRole(actorRole, invite.roleAssigned)) {
    throw new ApiError(403, 'You do not have permission to revoke invitations for this role.');
  }

  invite.status = 'revoked';
  invite.revokedAt = new Date();
  await invite.save();

  logger.info(
    `[ADMIN INVITE] Invitation ${id} for ${invite.email} revoked by ${(req as any).user!.id}`,
  );

  res.status(200).json(new ApiResponse(true, 'Invitation revoked successfully', invite));
});

/**
 * Get my pending invitations (Client checking on load/login)
 * Protected by requireAuth
 */
export const getMyPendingInvite = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.id;

  const invite = await AdminInvite.findOne({
    invitedUser: userId,
    status: 'pending',
  }).populate('invitedBy', 'name email');

  if (!invite) {
    return res.status(200).json(new ApiResponse(true, 'No pending admin invitations found', null));
  }

  res.status(200).json(new ApiResponse(true, 'Pending admin invitation found', invite));
});

/**
 * Respond to an invitation (Accept / Reject)
 * Protected by requireAuth
 */
export const respondToAdminInvite = asyncHandler(async (req: Request, res: Response) => {
  const { inviteId, action } = req.body;
  const userId = (req as any).user!.id;

  if (!inviteId || !['accept', 'reject'].includes(action)) {
    throw new ApiError(400, 'inviteId and action ("accept" or "reject") are required');
  }

  const invite = await AdminInvite.findOne({
    _id: inviteId,
    invitedUser: userId,
    status: 'pending',
  });

  if (!invite) {
    throw new ApiError(404, 'No pending invitation found matching the given ID for your account.');
  }

  if (action === 'accept') {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    // Grant access privileges
    const previousRole = user.role;
    user.role = invite.roleAssigned;
    user.passwordChangedAt = new Date(); // Revokes legacy sessions
    await user.save();

    // Mark invitation accepted
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    await invite.save();

    // Invalidate user session caches
    await invalidateUserSessionCaches(String(userId));

    logger.info(
      `[ADMIN INVITE ACCEPTED] User ${userId} accepted invite. Upgraded from ${previousRole} to ${invite.roleAssigned}`,
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          true,
          `You have successfully accepted the invitation and are now a ${invite.roleAssigned}!`,
          { role: invite.roleAssigned },
        ),
      );
  } else {
    // Mark invitation rejected
    invite.status = 'rejected';
    invite.rejectedAt = new Date();
    await invite.save();

    logger.info(
      `[ADMIN INVITE REJECTED] User ${userId} rejected invite to become ${invite.roleAssigned}`,
    );

    res
      .status(200)
      .json(new ApiResponse(true, 'You have rejected the invitation.', { status: 'rejected' }));
  }
});
