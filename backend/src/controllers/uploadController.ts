import { Request, Response } from 'express';
import { uploadOnCloudinary } from '../utils/cloudinary';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import fs from 'fs';

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const urls: string[] = [];

  // Handle remote URLs
  if (req.body.urls) {
    const remoteUrls = Array.isArray(req.body.urls) ? req.body.urls : [req.body.urls];
    for (const url of remoteUrls) {
      if (typeof url === 'string' && url.startsWith('http')) {
        const response = await uploadOnCloudinary(url);
        if (response) {
          urls.push(response.secure_url);
        }
      }
    }
  }

  // Handle local file uploads
  if (req.files && (req.files as Express.Multer.File[]).length > 0) {
    const files = req.files as Express.Multer.File[];
    for (const file of files) {
      const response = await uploadOnCloudinary(file.path);
      if (response) {
        urls.push(response.secure_url);
      }
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  if (urls.length === 0) {
    throw new ApiError(400, 'No files or valid URLs provided');
  }

  res.status(200).json(new ApiResponse(true, 'Files uploaded successfully', urls));
});
