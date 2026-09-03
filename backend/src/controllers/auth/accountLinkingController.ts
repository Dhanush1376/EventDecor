import { Request, Response } from 'express';
import { AccountLinkingService } from '../../services/AccountLinkingService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';

export const getLinkedProviders = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const providers = await AccountLinkingService.getLinkedProviders(userId);
  res.status(200).json(new ApiResponse(true, 'Linked providers', providers));
});

export const linkGoogle = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;
  const userId = (req as any).user.id;
  const iat = (req as any).user.iat * 1000;

  await AccountLinkingService.linkGoogle(userId, credential, new Date(iat), req.ip || '127.0.0.1');
  res.status(200).json(new ApiResponse(true, 'Google account connected successfully.'));
});

export const linkPhoneRequest = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const userId = (req as any).user.id;
  const iat = (req as any).user.iat * 1000;

  const { challengeId } = await AccountLinkingService.requestPhoneLink(
    userId,
    phone,
    new Date(iat),
    req.ip || '127.0.0.1',
  );
  res.status(200).json(new ApiResponse(true, 'Verification code sent.', { challengeId }));
});

export const linkPhoneVerify = asyncHandler(async (req: Request, res: Response) => {
  const { challengeId, otp } = req.body;
  const userId = (req as any).user.id;

  await AccountLinkingService.verifyPhoneLink(userId, challengeId, otp, req.ip || '127.0.0.1');
  res.status(200).json(new ApiResponse(true, 'Phone number connected successfully.'));
});

export const unlinkProvider = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.params;
  const userId = (req as any).user.id;
  const iat = (req as any).user.iat * 1000;

  await AccountLinkingService.unlinkProvider(
    userId,
    provider as 'email' | 'phone' | 'google',
    new Date(iat),
    req.ip || '127.0.0.1',
  );
  res.status(200).json(new ApiResponse(true, `${provider} disconnected successfully.`));
});
