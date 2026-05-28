import { Request, Response, NextFunction } from 'express';
import Policy from '../models/Policy';
import ApiError from '../utils/ApiError';

export const getAllPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await Policy.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
};

export const getPolicyBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const policy = await Policy.findOne({ slug });
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
    const policy = await Policy.findById(id);
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
    const policy = new Policy({
      ...req.body,
      lastUpdatedBy: (req as any).user?._id,
    });
    await policy.save();
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

export const updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findByIdAndUpdate(
      id,
      { ...req.body, lastUpdatedBy: (req as any).user?._id },
      { new: true, runValidators: true }
    );
    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

export const deletePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findByIdAndDelete(id);
    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }
    res.status(200).json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    next(error);
  }
};
