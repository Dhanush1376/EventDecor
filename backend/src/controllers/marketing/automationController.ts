import { Request, Response } from 'express';
import MarketingAutomation from '../../models/MarketingAutomation';
import AutomationEnrollment from '../../models/AutomationEnrollment';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import AutomationEngineService from '../../services/marketing/AutomationEngineService';
import { AdminAuditService } from '../../services/AdminAuditService';

/**
 * GET /api/v1/marketing/automations
 * List all lifecycle automations with real-time stats
 */
export const getAutomations = asyncHandler(async (_req: Request, res: Response) => {
  // Ensure default automations (e.g. Abandoned Cart) exist
  await AutomationEngineService.initializeDefaultAutomations();

  const automations = await MarketingAutomation.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  // Enrich each automation with current active enrollment count
  const enrichedAutomations = await Promise.all(
    automations.map(async (auto) => {
      const activeEnrollments = await AutomationEnrollment.countDocuments({
        automationId: auto._id,
        status: 'active',
      });
      return {
        ...auto,
        activeEnrollments,
      };
    }),
  );

  res.status(200).json(new ApiResponse(true, 'Automations fetched', enrichedAutomations));
});

/**
 * GET /api/v1/marketing/automations/:id
 */
export const getAutomationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const automation = await MarketingAutomation.findById(id).lean();
  if (!automation) throw new ApiError(404, 'Automation not found');

  const activeEnrollments = await AutomationEnrollment.countDocuments({
    automationId: automation._id,
    status: 'active',
  });

  res.status(200).json(
    new ApiResponse(true, 'Automation details retrieved', {
      ...automation,
      activeEnrollments,
    }),
  );
});

/**
 * PATCH /api/v1/marketing/automations/:id
 * Toggle status or update workflow steps
 */
export const updateAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUser = (req as any).user;
  const automation = await MarketingAutomation.findById(id);
  if (!automation) throw new ApiError(404, 'Automation not found');

  const { status, steps, stopConditions, frequencyGuard, name, description } = req.body;

  if (status !== undefined) automation.status = status;
  if (steps !== undefined) automation.steps = steps;
  if (stopConditions !== undefined) automation.stopConditions = stopConditions;
  if (frequencyGuard !== undefined) automation.frequencyGuard = frequencyGuard;
  if (name !== undefined) automation.name = name;
  if (description !== undefined) automation.description = description;

  await automation.save();

  AdminAuditService.logAction({
    actorId: adminUser?._id?.toString(),
    actorEmail: adminUser?.email,
    actorRole: adminUser?.role,
    entityType: 'MarketingAutomation',
    entityId: automation._id.toString(),
    action: 'UPDATE',
    newValue: { status: automation.status, name: automation.name },
  }).catch(() => {});

  res.status(200).json(new ApiResponse(true, 'Automation updated successfully', automation));
});

/**
 * GET /api/v1/marketing/automations/:id/enrollments
 * Paginated list of customers currently or previously enrolled in this workflow
 */
export const getAutomationEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  const query: any = { automationId: id };
  if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [enrollments, total] = await Promise.all([
    AutomationEnrollment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'name email loyaltyTier')
      .lean(),
    AutomationEnrollment.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Enrollments retrieved', {
      enrollments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    }),
  );
});

/**
 * POST /api/v1/marketing/automations/scan-now
 * Force immediate execution and scanning of abandoned carts and step dispatches
 */
export const triggerManualScan = asyncHandler(async (_req: Request, res: Response) => {
  const enrolledCount = await AutomationEngineService.scanAndEnrollAbandonedCarts();
  const stepResult = await AutomationEngineService.processDueEnrollments();

  res.status(200).json(
    new ApiResponse(true, 'Automation scan and execution finished', {
      newlyEnrolledCarts: enrolledCount,
      stepExecution: stepResult,
    }),
  );
});
