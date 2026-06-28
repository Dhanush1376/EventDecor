import { Request, Response } from 'express';

import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { CategoryService } from '../../services/CategoryService';

export const getActiveCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  const filter: any = {};
  if (type) filter.type = type;

  const categories = await CategoryService.getActiveCategories(filter);
  res.status(200).json(new ApiResponse(true, 'Categories fetched successfully', categories));
});

export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await CategoryService.getAllCategories();
  res.status(200).json(new ApiResponse(true, 'All categories fetched successfully', categories));
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoryService.createCategory(req.body);
  res.status(201).json(new ApiResponse(true, 'Category created successfully', category));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoryService.updateCategory(req.params.id as string, req.body);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  res.status(200).json(new ApiResponse(true, 'Category updated successfully', category));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await CategoryService.deleteCategory(req.params.id as string, (req as any).user);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  res.status(200).json(new ApiResponse(true, 'Category deleted successfully', category));
});
