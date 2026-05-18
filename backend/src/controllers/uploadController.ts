import { Request, Response } from 'express';
import { uploadOnCloudinary } from '../utils/cloudinary';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import fs from 'fs';

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }

  const files = req.files as Express.Multer.File[];
  const urls: string[] = [];

  for (const file of files) {
    const response = await uploadOnCloudinary(file.path);
    if (response) {
      urls.push(response.secure_url);
    }
    // Remove local file after upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }

  res.status(200).json(new ApiResponse(true, 'Files uploaded successfully', urls));
});
