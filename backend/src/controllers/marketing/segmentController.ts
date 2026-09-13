import { Request, Response } from 'express';
import CampaignSegment from '../../models/CampaignSegment';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import AudienceResolverService from '../../services/marketing/AudienceResolverService';
import { AdminAuditService } from '../../services/AdminAuditService';

/**
 * GET /api/v1/marketing/segments
 * Returns all saved custom segments alongside dynamically calculated pre-built system segments
 */
export const getSegments = asyncHandler(async (_req: Request, res: Response) => {
  // 1. Fetch saved segments from database
  const savedSegments = await CampaignSegment.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email')
    .lean();

  // 2. Fetch system segment definitions
  const systemDefinitions = AudienceResolverService.getSystemSegmentDefinitions();

  // 3. Calculate real-time counts for all segments
  const systemSegmentsWithCounts = await Promise.all(
    systemDefinitions.map(async (sys) => {
      const countResult = await AudienceResolverService.countAudience({
        filterRules: sys.rules,
        combinator: sys.combinator,
      });
      return {
        _id: `system_${sys.systemKey}`,
        name: sys.name,
        description: sys.description,
        isSystem: true,
        systemKey: sys.systemKey,
        rules: sys.rules,
        combinator: sys.combinator,
        estimatedCount: countResult.eligibleRecipients,
        lastCalculatedAt: new Date(),
      };
    }),
  );

  const customSegmentsWithCounts = await Promise.all(
    savedSegments.map(async (seg) => {
      const countResult = await AudienceResolverService.countAudience({
        filterRules: seg.rules,
        combinator: seg.combinator,
      });
      return {
        ...seg,
        estimatedCount: countResult.eligibleRecipients,
      };
    }),
  );

  res.status(200).json(
    new ApiResponse(true, 'Segments fetched', {
      systemSegments: systemSegmentsWithCounts,
      customSegments: customSegmentsWithCounts,
    }),
  );
});

/**
 * POST /api/v1/marketing/segments
 */
export const createSegment = asyncHandler(async (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  const { name, description, rules, combinator = 'AND' } = req.body;

  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    throw new ApiError(400, 'Segment name and at least one filter rule are required');
  }

  // Calculate initial audience count
  const countResult = await AudienceResolverService.countAudience({
    filterRules: rules,
    combinator,
  });

  const segment = new CampaignSegment({
    name,
    description,
    rules,
    combinator,
    estimatedCount: countResult.eligibleRecipients,
    lastCalculatedAt: new Date(),
    isSystem: false,
    createdBy: adminUser?._id,
  });

  await segment.save();

  AdminAuditService.logAction({
    actorId: adminUser?._id?.toString(),
    actorEmail: adminUser?.email,
    actorRole: adminUser?.role,
    entityType: 'CampaignSegment',
    entityId: segment._id.toString(),
    action: 'CREATE',
    newValue: { name, ruleCount: rules.length },
  }).catch(() => {});

  res.status(201).json(new ApiResponse(true, 'Segment created successfully', segment));
});

/**
 * PATCH /api/v1/marketing/segments/:id
 */
export const updateSegment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const segment = await CampaignSegment.findById(id);
  if (!segment) throw new ApiError(404, 'Segment not found');

  const { name, description, rules, combinator } = req.body;

  if (name !== undefined) segment.name = name;
  if (description !== undefined) segment.description = description;
  if (rules !== undefined) segment.rules = rules;
  if (combinator !== undefined) segment.combinator = combinator;

  // Recalculate count
  const countResult = await AudienceResolverService.countAudience({
    filterRules: segment.rules,
    combinator: segment.combinator,
  });
  segment.estimatedCount = countResult.eligibleRecipients;
  segment.lastCalculatedAt = new Date();

  await segment.save();
  res.status(200).json(new ApiResponse(true, 'Segment updated successfully', segment));
});

/**
 * DELETE /api/v1/marketing/segments/:id
 */
export const deleteSegment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const segment = await CampaignSegment.findById(id);
  if (!segment) throw new ApiError(404, 'Segment not found');

  await segment.softDelete();
  res.status(200).json(new ApiResponse(true, 'Segment deleted successfully'));
});
