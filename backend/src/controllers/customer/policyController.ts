import { Request, Response, NextFunction } from 'express';
import Policy from '../../models/Policy';
import VersionHistory from '../../models/VersionHistory';
import ApiError from '../../utils/ApiError';
import { getIO } from '../../socket';
import { PolicyAiService } from '../../services/PolicyAiService';

export const generatePolicyAi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic, existingPolicy } = req.body;
    if (!topic) throw new ApiError(400, 'Topic is required');
    const result = await PolicyAiService.generatePolicy(topic, existingPolicy);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
export const getAllPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await Policy.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
};

export const getPublicPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await Policy.find({ status: 'published' })
      .select('title slug')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
};

export const getPolicyBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    // Only return published policies for public storefront
    const policy = await Policy.findOne({ slug, status: 'published' }).lean();
    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

export const getPolicyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findById(id).lean();
    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

export const createPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const policy = new Policy({
      ...req.body,
      version: 1,
      lastUpdatedBy: user?._id,
    });
    await policy.save();

    await VersionHistory.create({
      entityType: 'Policy',
      entityId: policy._id,
      version: policy.version,
      data: policy.toObject(),
      changedBy: { userId: user?._id, email: user?.email, role: user?.role },
      changeType: 'create',
    });

    try {
      getIO().of('/visitor').emit('policy-updated', { slug: policy.slug });
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (e) {}

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

export const updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const existingPolicy = await Policy.findById(id);
    if (!existingPolicy) {
      throw new ApiError(404, 'Policy not found');
    }

    const newVersion = (existingPolicy.version || 1) + 1;

    const policy = await Policy.findByIdAndUpdate(
      id,
      { ...req.body, version: newVersion, lastUpdatedBy: user?._id },
      { returnDocument: 'after', runValidators: true },
    );

    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }

    await VersionHistory.create({
      entityType: 'Policy',
      entityId: policy._id,
      version: policy.version,
      data: policy.toObject(),
      changedBy: { userId: user?._id, email: user?.email, role: user?.role },
      changeType: 'update',
    });

    try {
      getIO().of('/visitor').emit('policy-updated', { slug: policy.slug });
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (e) {}

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

export const deletePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const policy = await Policy.findByIdAndDelete(id);
    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }

    await VersionHistory.create({
      entityType: 'Policy',
      entityId: policy._id,
      version: (policy.version || 1) + 1,
      data: policy.toObject(),
      changedBy: { userId: user?._id, email: user?.email, role: user?.role },
      changeType: 'soft_delete',
    });

    try {
      getIO().of('/visitor').emit('policy-deleted', { slug: policy.slug });
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPolicyVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versions = await VersionHistory.find({ entityType: 'Policy', entityId: id })
      .sort({
        version: -1,
      })
      .lean();
    res.status(200).json({ success: true, data: versions });
  } catch (error) {
    next(error);
  }
};

export const restorePolicyVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, version } = req.params;
    const user = (req as any).user;

    const versionRecord = await VersionHistory.findOne({
      entityType: 'Policy',
      entityId: id,
      version: Number(version),
    });
    if (!versionRecord) {
      throw new ApiError(404, 'Version not found');
    }

    const existingPolicy = await Policy.findById(id);
    if (!existingPolicy) {
      throw new ApiError(404, 'Policy not found');
    }

    const newVersion = (existingPolicy.version || 1) + 1;

    const restoredData = versionRecord.data;
    delete restoredData._id;
    delete restoredData.id;
    delete restoredData.version;

    const policy = await Policy.findByIdAndUpdate(
      id,
      { ...restoredData, version: newVersion, lastUpdatedBy: user?._id },
      { returnDocument: 'after', runValidators: true },
    );

    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }

    await VersionHistory.create({
      entityType: 'Policy',
      entityId: policy._id,
      version: policy.version,
      data: policy.toObject(),
      changedBy: { userId: user?._id, email: user?.email, role: user?.role },
      changeType: 'restore',
    });

    try {
      getIO().of('/user').emit('policy-updated', { slug: policy.slug });
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (e) {}

    res.status(200).json({ success: true, data: policy, message: 'Policy restored successfully' });
  } catch (error) {
    next(error);
  }
};
