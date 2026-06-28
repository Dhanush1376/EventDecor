import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { AdminInviteService } from '../../services/AdminInviteService';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { setPaginationHeaders } from '../../utils/paginationHeaders';

export const createAdminInvite = asyncHandler(async (req: Request, res: Response) => {
  const { email, role, permissionsSummary } = req.body;
  const actorId = (req as any).user!.id;
  const actorRole = (req as any).user!.role;

  if (!email || !role) {
    throw new ApiError(400, 'Email and Role are required fields');
  }

  const invite = await AdminInviteService.createInvite(
    actorId,
    actorRole,
    email,
    role,
    permissionsSummary,
  );
  res.status(201).json(new ApiResponse(true, 'Admin invitation created successfully', invite));
});

export const getPendingInvites = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { invites, totalCount } = await AdminInviteService.getPendingInvites(skip, limit);

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

export const getInviteHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { invites, totalCount } = await AdminInviteService.getInviteHistory(skip, limit);

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

export const revokeAdminInvite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = (req as any).user!.id;
  const actorRole = (req as any).user!.role;

  const invite = await AdminInviteService.revokeInvite(id as string, actorId, actorRole);
  res.status(200).json(new ApiResponse(true, 'Invitation revoked successfully', invite));
});

export const getMyPendingInvite = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.id;
  const invite = await AdminInviteService.getMyPendingInvite(userId);

  if (!invite) {
    return res.status(200).json(new ApiResponse(true, 'No pending admin invitations found', null));
  }
  res.status(200).json(new ApiResponse(true, 'Pending admin invitation found', invite));
});

export const respondToAdminInvite = asyncHandler(async (req: Request, res: Response) => {
  const { inviteId, action } = req.body;
  const userId = (req as any).user!.id;

  if (!inviteId || !['accept', 'reject'].includes(action)) {
    throw new ApiError(400, 'inviteId and action ("accept" or "reject") are required');
  }

  const result = await AdminInviteService.respondToInvite(inviteId, userId, action);

  if (result.status === 'accepted') {
    res
      .status(200)
      .json(
        new ApiResponse(
          true,
          `You have successfully accepted the invitation and are now a ${result.role}!`,
          { role: result.role },
        ),
      );
  } else {
    res
      .status(200)
      .json(new ApiResponse(true, 'You have rejected the invitation.', { status: 'rejected' }));
  }
});
