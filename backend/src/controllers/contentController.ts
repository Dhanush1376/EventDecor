import { Request, Response } from 'express';
import ContentService from '../services/contentService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

export const getPublishedContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await ContentService.getPublishedContent();
  res.status(200).json(new ApiResponse(true, 'Content fetched', content));
});

export const getSectionByKey = asyncHandler(async (req: Request, res: Response) => {
  const section = await ContentService.getSectionByKey(req.params.key as string);
  res.status(200).json(new ApiResponse(true, 'Section fetched', section));
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await ContentService.updateSection(req.params.key as string, req.body);
  res.status(200).json(new ApiResponse(true, 'Section updated', section));
});

export const publishAll = asyncHandler(async (req: Request, res: Response) => {
  const result = await ContentService.publishAll();
  res.status(200).json(new ApiResponse(true, 'All sections published', result));
});
