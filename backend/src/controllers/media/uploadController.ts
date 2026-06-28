import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { ImageUploadService } from '../../services/ImageUploadService';

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const remoteUrls = req.body.urls
    ? Array.isArray(req.body.urls)
      ? req.body.urls
      : [req.body.urls]
    : [];

  const localFiles = (req.files as Express.Multer.File[]) || [];

  const urls = await ImageUploadService.processAndUploadImages(remoteUrls, localFiles);

  res.status(200).json(new ApiResponse(true, 'Files uploaded successfully', urls));
});
