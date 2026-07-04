import { Request, Response } from 'express';
import Product from '../../models/Product';
import ProductService from '../../services/productService';
import { ProductAiService } from '../../services/ProductAiService';
import FilterService from '../../services/FilterService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const start = performance.now();
  const result = await ProductService.getAllProducts(req.query);
  const mid = performance.now();
  logger.info(`[Timing] ProductService + MongoQuery: ${(mid - start).toFixed(3)}ms`);

  if (!res.headersSent) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.status(200).json(new ApiResponse(true, 'Products fetched successfully', result));
  }
  const end = performance.now();
  logger.info(`[Timing] ResponseSerialization: ${(end - mid).toFixed(3)}ms`);
});

export const getDynamicFilters = asyncHandler(async (req: Request, res: Response) => {
  const result = await FilterService.getDynamicFilters(req.query);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(new ApiResponse(true, 'Filters fetched successfully', result));
});

export const getAdminProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await ProductService.getAllProducts(req.query, true); // true = isAdmin
  if (!res.headersSent) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.status(200).json(new ApiResponse(true, 'Admin products fetched successfully', result));
  }
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.getProductById(req.params.id as string);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(new ApiResponse(true, 'Product fetched successfully', product));
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.createProduct(req.body, req.user);
  const populated = await Product.findById(product._id)
    .populate('primaryCategory', 'name slug type')
    .populate('secondaryCategories', 'name slug type')
    .lean();
  res.status(201).json(new ApiResponse(true, 'Product created successfully', populated));
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.updateProduct(req.params.id as string, req.body, req.user);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  const populated = await Product.findById(product._id)
    .populate('primaryCategory', 'name slug type')
    .populate('secondaryCategories', 'name slug type')
    .lean();
  res.status(200).json(new ApiResponse(true, 'Product updated successfully', populated));
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.deleteProduct(req.params.id as string, req.user);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.status(200).json(new ApiResponse(true, 'Product moved to recycle bin successfully', product));
});

export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.toggleFeatured(req.params.id as string);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        `Product ${product.featured ? 'featured' : 'unfeatured'} successfully`,
        product,
      ),
    );
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await ProductService.getDistinctCategories();
  res.setHeader(
    'Cache-Control',
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
  );
  res.status(200).json(new ApiResponse(true, 'Categories fetched successfully', categories));
});

export const aiAutofillProduct = asyncHandler(async (req: Request, res: Response) => {
  const { title, imageSrc, categoryList } = req.body;
  const parsedData = await ProductAiService.analyzeProductImage(title, imageSrc, categoryList);
  res
    .status(200)
    .json(new ApiResponse(true, 'AI specifications generated successfully', parsedData));
});

export const refineAiProduct = asyncHandler(async (req: Request, res: Response) => {
  const { previousResult, prompt } = req.body;
  const parsedData = await ProductAiService.refineAiProduct(previousResult, prompt);
  res.status(200).json(new ApiResponse(true, 'AI specifications refined successfully', parsedData));
});
