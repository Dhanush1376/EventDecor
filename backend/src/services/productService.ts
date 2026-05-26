import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product';
import Gallery from '../models/Gallery';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cacheVersion';
import { categoryCache } from '../utils/MemoryCache';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';
import { analyzeQueryWithAI, escapeRegex } from './searchService';

class ProductService {
  static async getAllProducts(queryParams: any) {
    const { category, search, sort, featured, minPrice, maxPrice, material, collection } = queryParams;
    const { page, limit, skip } = getPaginationOptions(queryParams);

    const filter: any = { isActive: true };

    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (material) {
      const materials = String(material).split(',').map((item) => item.trim()).filter(Boolean);
      if (materials.length > 0) filter.material = { $in: materials.map((item) => new RegExp(`^${item}$`, 'i')) };
    }
    if (collection) {
      const collections = String(collection).split(',').map((item) => item.trim()).filter(Boolean);
      if (collections.length > 0) filter.category = { $in: collections.map((item) => new RegExp(`^${item}$`, 'i')) };
    }

    let correctedQuery: string | undefined;

    if (search) {
      const aiAnalysis = await analyzeQueryWithAI(search);
      
      if (aiAnalysis.correctedQuery && aiAnalysis.correctedQuery.toLowerCase() !== search.toLowerCase()) {
        correctedQuery = aiAnalysis.correctedQuery;
      }

      // Apply price filter from AI budget analysis if not manually set
      if (aiAnalysis.priceMax && !maxPrice) {
        filter.price = filter.price || {};
        filter.price.$lte = aiAnalysis.priceMax;
      }
      if (aiAnalysis.priceMin && !minPrice) {
        filter.price = filter.price || {};
        filter.price.$gte = aiAnalysis.priceMin;
      }

      // Apply category from AI if not manually set
      if (aiAnalysis.category && !category) {
        filter.category = new RegExp(`^${aiAnalysis.category}$`, 'i');
      }

      const allSearchTerms = [
        search,
        aiAnalysis.correctedQuery,
        ...aiAnalysis.expandedTerms
      ];
      const uniqueSearchTerms = [...new Set(allSearchTerms.filter(Boolean))];
      const regexPatterns = uniqueSearchTerms.map(t => new RegExp(escapeRegex(t), 'i'));

      filter.$or = [
        { title: { $in: regexPatterns } },
        { teluguTitle: { $in: regexPatterns } },
        { category: { $in: regexPatterns } },
        { material: { $in: regexPatterns } },
        { tags: { $in: regexPatterns } },
        { description: { $in: regexPatterns } }
      ];

      // Match colors if detected
      if (aiAnalysis.colors.length > 0) {
        filter.$or.push({ tags: { $in: aiAnalysis.colors.map(c => new RegExp(escapeRegex(c), 'i')) } });
      }
    }

    let sortOptions: any = { createdAt: -1 };
    if (sort) {
      if (sort === 'price_asc') sortOptions = { price: 1 };
      else if (sort === 'price_desc') sortOptions = { price: -1 };
      else if (sort === 'newest') sortOptions = { createdAt: -1 };
      else if (sort === 'rating') sortOptions = { rating: -1 };
    }

    const [products, totalCount] = await Promise.all([
      Product.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    const response: any = formatPaginationResponse(products, totalCount, page, limit);
    response.correctedQuery = correctedQuery;
    return response;
  }

  static async getProductById(idOrSlug: string) {
    let product;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      product = await Product.findById(idOrSlug).lean();
    } else {
      product = await Product.findOne({ slug: idOrSlug.toLowerCase() }).lean();
    }
    if (!product || !product.isActive) return null;
    return product;
  }

  static async createProduct(data: Partial<IProduct>) {
    const product = new Product(data);
    const saved = await product.save();
    if (saved.showInGallery) {
      await this.syncToGallery(saved);
    }
    logger.info('[CATEGORY CACHE] Purging distinct categories cache due to new product creation');
    categoryCache.delete('product:distinct_categories');
    await bumpPublicCacheVersion();
    return saved;
  }

  static async updateProduct(id: string, data: Partial<IProduct>) {
    const oldProduct = await Product.findById(id);
    
    const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    
    if (oldProduct && product) {
      // Clean up primary product image if replaced
      if (data.imageSrc && oldProduct.imageSrc && oldProduct.imageSrc !== data.imageSrc) {
        const publicId = extractPublicId(oldProduct.imageSrc);
        if (publicId) {
          deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up old product image: ${err}`));
        }
      }

      // Clean up removed auxiliary product images if replaced
      if (data.images && oldProduct.images && Array.isArray(oldProduct.images)) {
        const newImagesSet = new Set(data.images);
        const removedImages = oldProduct.images.filter((img: string) => !newImagesSet.has(img));
        for (const img of removedImages) {
          const publicId = extractPublicId(img);
          if (publicId) {
            deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up old product sub-image: ${err}`));
          }
        }
      }
    }

    if (product) {
      if (product.showInGallery) {
        await this.syncToGallery(product);
      } else {
        await this.removeFromGallery(product._id);
      }
    }
    logger.info('[CATEGORY CACHE] Purging distinct categories cache due to product update');
    categoryCache.delete('product:distinct_categories');
    await bumpPublicCacheVersion();
    return product;
  }

  static async deleteProduct(id: string) {
    const product = await Product.findById(id);
    if (!product) return null;

    // Hard delete
    await Product.findByIdAndDelete(id);

    // Clean up gallery
    await this.removeFromGallery(product._id);

    // Clean up User wishlist, cart, and recentlyViewed references to prevent orphan/dead links
    const User = require('../models/User').default || require('../models/User');
    User.updateMany(
      {},
      {
        $pull: {
          wishlist: product._id,
          cart: { product: product._id },
          recentlyViewed: { product: product._id }
        }
      }
    ).catch((err: any) => logger.error(`Failed to clean up user references for deleted product ${id}: ${err}`));

    // Clean up product reviews
    const Review = require('../models/Review').default || require('../models/Review');
    Review.deleteMany({ product: product._id })
      .catch((err: any) => logger.error(`Failed to clean up reviews for deleted product ${id}: ${err}`));

    // Clean up main product image from Cloudinary
    if (product.imageSrc) {
      const publicId = extractPublicId(product.imageSrc);
      if (publicId) {
        deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up deleted product image: ${err}`));
      }
    }

    // Clean up auxiliary images from Cloudinary
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        const publicId = extractPublicId(img);
        if (publicId) {
          deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up deleted product sub-image: ${err}`));
        }
      }
    }

    logger.info('[CATEGORY CACHE] Purging distinct categories cache due to product deletion');
    categoryCache.delete('product:distinct_categories');
    await bumpPublicCacheVersion();
    return product;
  }


  static async syncToGallery(product: any) {
    try {
      let galleryItem = await Gallery.findOne({ linkedProducts: product._id });
      if (galleryItem) {
        galleryItem.title = product.title;
        galleryItem.teluguTitle = product.teluguTitle;
        galleryItem.category = product.category;
        galleryItem.image = product.imageSrc;
        galleryItem.description = product.description;
        galleryItem.tags = product.tags || [];
        galleryItem.isActive = product.isActive;
        await galleryItem.save();
      } else {
        galleryItem = new Gallery({
          title: product.title,
          teluguTitle: product.teluguTitle,
          category: product.category,
          image: product.imageSrc,
          description: product.description,
          tags: product.tags || [],
          linkedProducts: [product._id],
          isActive: product.isActive,
        });
        await galleryItem.save();
      }
    } catch (err) {
      logger.error('Error syncing product to gallery:', err);
    }
  }

  static async removeFromGallery(productId: any) {
    try {
      const items = await Gallery.find({ linkedProducts: productId });
      for (const item of items) {
        if (item.image) {
          const publicId = extractPublicId(item.image);
          if (publicId) {
            deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up gallery image: ${err}`));
          }
        }
      }
      await Gallery.deleteMany({ linkedProducts: productId });
    } catch (err) {
      logger.error('Error removing product from gallery:', err);
    }
  }

  static async toggleFeatured(id: string) {
    const product = await Product.findById(id);
    if (!product) return null;
    product.featured = !product.featured;
    const saved = await product.save();
    return saved;
  }

  static async getDistinctCategories() {
    const cacheKey = 'product:distinct_categories';
    const cached = categoryCache.get<string[]>(cacheKey);
    if (cached !== null) {
      logger.info('[CATEGORY CACHE] Cache Hit for distinct categories');
      return cached;
    }

    logger.info('[CATEGORY CACHE] Cache Miss. Fetching distinct categories from database');
    const categories = await Product.distinct('category', { isActive: true });
    const result = categories.filter(Boolean).sort();
    categoryCache.set(cacheKey, result);
    return result;
  }
}

export default ProductService;
