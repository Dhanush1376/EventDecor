import ApiError from '../../utils/ApiError';
import TeamInvite from '../../models/TeamInvite';
import User from '../../models/User';
import { canonicalizeEmail } from '../../utils/email/emailHelper';
import { STAFF_ROLES } from '../../config/adminConfig';
import { UserService } from './userService';

export class TeamInviteService {
  static async getTeamMembers(skip: number, limit: number) {
    const [members, memberCount, invites, inviteCount] = await Promise.all([
      User.find({ role: { $in: STAFF_ROLES } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ role: { $in: STAFF_ROLES } }),
      TeamInvite.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TeamInvite.countDocuments(),
    ]);

    return {
      members,
      memberCount,
      invites,
      inviteCount,
      totalCount: memberCount + inviteCount,
    };
  }

  static async inviteTeamMember(
    email: string,
    role: string,
    permissions: string,
    inviterId: string,
  ) {
    return UserService.inviteTeamMember(email, role, permissions, inviterId);
  }

  static async cancelTeamInvite(inviteId: string) {
    const invite = await TeamInvite.findById(inviteId);
    if (!invite) throw new ApiError(404, 'Invitation not found');

    if (invite.status !== 'pending') {
      throw new ApiError(400, 'Only pending invitations can be cancelled');
    }

    await TeamInvite.findByIdAndDelete(inviteId);
  }

  static async getInviteDetailsByToken(token: string) {
    const invite = await TeamInvite.findOne({ token });
    if (!invite) throw new ApiError(404, 'Invalid or expired invitation token');

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ApiError(400, 'This invitation link has expired.');
    }

    return invite;
  }

  static async respondToInvite(token: string, status: 'accepted' | 'declined') {
    const invite = await TeamInvite.findOne({ token, status: 'pending' });
    if (!invite) throw new ApiError(404, 'Invalid, expired, or already-processed invitation');

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ApiError(400, 'This invitation link has expired and cannot be accepted.');
    }

    invite.status = status;
    await invite.save();

    if (status === 'accepted') {
      const cleanEmail = canonicalizeEmail(invite.email);
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        await User.create({
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: invite.role,
          isVerified: true,
        });
      } else {
        user.role = invite.role;
        await user.save();
      }
    }

    return { status };
  }
}
