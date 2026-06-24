import { Request, Response } from 'express';
import Blog from '../models/Blog';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

export const getBlogs = asyncHandler(async (req: Request, res: Response) => {
  const blogs = await Blog.find().sort({ publishDate: -1 });
  res.status(200).json(new ApiResponse(true, 'Blogs fetched successfully', blogs));
});

export const getBlogBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const blog = await Blog.findOne({ slug });

  if (!blog) {
    throw new ApiError(404, 'Blog post not found');
  }

  res.status(200).json(new ApiResponse(true, 'Blog fetched successfully', blog));
});

// Admin routes
export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const blog = await Blog.create(req.body);
  res.status(201).json(new ApiResponse(true, 'Blog created successfully', blog));
});

export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const blog = await Blog.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

  if (!blog) {
    throw new ApiError(404, 'Blog post not found');
  }

  res.status(200).json(new ApiResponse(true, 'Blog updated successfully', blog));
});

export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const blog = await Blog.findByIdAndDelete(id);

  if (!blog) {
    throw new ApiError(404, 'Blog post not found');
  }

  res.status(200).json(new ApiResponse(true, 'Blog deleted successfully', null));
});
