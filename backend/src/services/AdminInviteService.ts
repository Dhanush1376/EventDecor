import User from '../models/User';
import AdminInvite from '../models/AdminInvite';
import logger from '../config/logger';
import { canonicalizeEmail } from '../utils/email/emailHelper';
import { canActorManageTarget, canActorAssignRole } from '../config/adminConfig';
import ApiError from '../utils/ApiError';
import { invalidateUserSessionCaches } from '../utils/cache/userSessionCache';

export class AdminInviteService {
  /**
   * Creates an invitation for an existing user to the Admin Portal
   */
  static async createInvite(
    actorId: string,
    actorRole: string,
    email: string,
    role: string,
    permissionsSummary: string,
  ) {
    const cleanEmail = canonicalizeEmail(email);

    const targetUser = await User.findOne({ email: cleanEmail });
    if (!targetUser) {
      throw new ApiError(
        404,
        `No registered user found with email "${cleanEmail}". Admin access invitations can only be sent to existing registered accounts.`,
      );
    }

    if (String(targetUser._id) === String(actorId)) {
      throw new ApiError(
        400,
        'You cannot invite yourself to a role or escalate your own privileges.',
      );
    }

    if (!canActorManageTarget(actorRole, targetUser.role)) {
      throw new ApiError(
        403,
        `You do not have permission to manage users with the role "${targetUser.role}".`,
      );
    }

    if (!canActorAssignRole(actorRole, role)) {
      throw new ApiError(403, `You do not have permission to grant the role "${role}".`);
    }

    const existingPending = await AdminInvite.findOne({ email: cleanEmail, status: 'pending' });
    if (existingPending) {
      throw new ApiError(
        400,
        `A pending invitation to the role "${existingPending.roleAssigned}" already exists for this email.`,
      );
    }

    const invite = await AdminInvite.create({
      email: cleanEmail,
      roleAssigned: role as any,
      permissionsSummary: permissionsSummary || 'Access Admin Portal & Dashboard',
      status: 'pending',
      invitedBy: actorId,
      invitedUser: targetUser._id,
    });

    logger.info(
      `[ADMIN INVITE] Invite created for user ${cleanEmail} (ID: ${targetUser._id}) as ${role} by actor ${actorId}`,
    );

    return invite;
  }

  /**
   * Retrieves pending invites with pagination
   */
  static async getPendingInvites(skip: number, limit: number) {
    const [invites, totalCount] = await Promise.all([
      AdminInvite.find({ status: 'pending' })
        .populate('invitedBy', 'name email role')
        .populate('invitedUser', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminInvite.countDocuments({ status: 'pending' }),
    ]);
    return { invites, totalCount };
  }

  /**
   * Retrieves invite history with pagination
   */
  static async getInviteHistory(skip: number, limit: number) {
    const [invites, totalCount] = await Promise.all([
      AdminInvite.find()
        .populate('invitedBy', 'name email role')
        .populate('invitedUser', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminInvite.countDocuments(),
    ]);
    return { invites, totalCount };
  }

  /**
   * Revokes a pending invite
   */
  static async revokeInvite(id: string, actorId: string, actorRole: string) {
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

    if (!canActorAssignRole(actorRole, invite.roleAssigned)) {
      throw new ApiError(403, 'You do not have permission to revoke invitations for this role.');
    }

    invite.status = 'revoked';
    invite.revokedAt = new Date();
    await invite.save();

    logger.info(`[ADMIN INVITE] Invitation ${id} for ${invite.email} revoked by ${actorId}`);

    return invite;
  }

  /**
   * Gets pending invite for a specific user
   */
  static async getMyPendingInvite(userId: string) {
    return await AdminInvite.findOne({
      invitedUser: userId,
      status: 'pending',
    }).populate('invitedBy', 'name email');
  }

  /**
   * Responds to an invitation (accept or reject)
   */
  static async respondToInvite(inviteId: string, userId: string, action: string) {
    const invite = await AdminInvite.findOne({
      _id: inviteId,
      invitedUser: userId,
      status: 'pending',
    });

    if (!invite) {
      throw new ApiError(
        404,
        'No pending invitation found matching the given ID for your account.',
      );
    }

    if (action === 'accept') {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User account not found');
      }

      const previousRole = user.role;
      user.role = invite.roleAssigned;
      user.passwordChangedAt = new Date();
      await user.save();

      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      await invite.save();

      await invalidateUserSessionCaches(String(userId));

      logger.info(
        `[ADMIN INVITE ACCEPTED] User ${userId} accepted invite. Upgraded from ${previousRole} to ${invite.roleAssigned}`,
      );
      return { status: 'accepted', role: invite.roleAssigned };
    } else {
      invite.status = 'rejected';
      invite.rejectedAt = new Date();
      await invite.save();

      logger.info(
        `[ADMIN INVITE REJECTED] User ${userId} rejected invite to become ${invite.roleAssigned}`,
      );
      return { status: 'rejected' };
    }
  }
}
