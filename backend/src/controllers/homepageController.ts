import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import Product from '../models/Product';
import Review from '../models/Review';
import ContentSection from '../models/ContentSection';
import Category from '../models/Category';

// Aggregated homepage endpoint to reduce client-side API requests
export const getHomepageData = asyncHandler(async (req: Request, res: Response) => {
  // Use Promise.all to fetch all homepage data in parallel
  const [featuredProducts, categories, reviews, trending, offers] = await Promise.all([
    // 1. Featured Products
    Product.find({ featured: true, isActive: true })
      .select('title slug price oldPrice rating reviews imageSrc tags')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),

    // 2. Categories
    Category.find({ isActive: true, type: { $in: ['product', 'event', 'global'] } })
      .select('name slug icon imageSrc description type displayOrder')
      .sort({ displayOrder: 1 })
      .limit(10)
      .lean(),

    // 3. Featured Reviews
    Review.find({ status: 'approved', rating: { $gte: 4 } })
      .select('customerName rating comment location eventType category images')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),

    // 4. Trending/Popular Items
    Product.find({ isActive: true })
      .select('title slug price oldPrice rating reviews imageSrc category badges')
      .sort({ rating: -1, reviews: -1 })
      .limit(10)
      .lean(),

    // 5. Promotional Offers (from ContentSection)
    ContentSection.findOne({ sectionId: 'homepage-hero', isActive: true })
      .select('title subtitle backgroundImage primaryButton callToAction')
      .lean()
  ]);

  // Set Cache-Control headers for the CDN/browser to cache this aggregated response
  // 60 seconds public cache, 300 seconds stale-while-revalidate for CDN
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

  res.status(200).json(
    new ApiResponse(true, 'Homepage data fetched successfully', {
      featuredProducts,
      categories,
      reviews,
      trending,
      heroContent: offers,
    })
  );
});
