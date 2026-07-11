import { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import RewardCampaign from '../../models/RewardCampaign';
import RewardRule from '../../models/RewardRule';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user.id;
  const campaign = await RewardCampaign.create({
    ...req.body,
    createdBy: adminId,
  });
  res.status(201).json(new ApiResponse(true, 'Campaign created successfully', campaign));
});

export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await RewardCampaign.findByIdAndUpdate(
    id,
    { ...req.body, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(true, 'Campaign updated successfully', campaign));
});

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const [campaigns, totalCount] = await Promise.all([
    RewardCampaign.find({ isDeleted: false })
      .populate('rules')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RewardCampaign.countDocuments({ isDeleted: false }),
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Campaigns retrieved',
        formatPaginationResponse(campaigns, totalCount, page, limit),
      ),
    );
});

export const createRule = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user.id;
  const { campaignId } = req.body;

  const campaign = await RewardCampaign.findById(campaignId);
  if (!campaign) throw new ApiError(404, 'Campaign not found');

  const rule = await RewardRule.create({
    ...req.body,
    createdBy: adminId,
  });

  campaign.rules.push(rule._id as mongoose.Types.ObjectId);
  campaign.version += 1;
  await campaign.save();

  res.status(201).json(new ApiResponse(true, 'Rule created successfully', rule));
});

export const updateRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const rule = await RewardRule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!rule) throw new ApiError(404, 'Rule not found');

  await RewardCampaign.findByIdAndUpdate(rule.campaignId, { $inc: { version: 1 } });

  res.status(200).json(new ApiResponse(true, 'Rule updated successfully', rule));
});

export const getCampaignRules = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const rules = await RewardRule.find({ campaignId });
  res.status(200).json(new ApiResponse(true, 'Rules retrieved', rules));
});

export const deleteRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const rule = await RewardRule.findByIdAndDelete(id);
  if (rule) {
    await RewardCampaign.findByIdAndUpdate(rule.campaignId, {
      $pull: { rules: rule._id },
      $inc: { version: 1 },
    });
  }
  res.status(200).json(new ApiResponse(true, 'Rule deleted successfully'));
});

export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await RewardCampaign.findByIdAndUpdate(id, { isDeleted: true });
  res.status(200).json(new ApiResponse(true, 'Campaign deleted successfully'));
});
