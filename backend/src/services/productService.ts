import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product';
import Gallery from '../models/Gallery';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import { categoryCache, MemoryCache } from '../utils/cache/MemoryCache';
import redisClient from '../utils/cache/redis';
import { MediaService } from './media/MediaService';
import { analyzeQueryWithAI, escapeRegex, getMatchingProductCategory } from './searchService';
import Category from '../models/Category';
import Coupon from '../models/Coupon';
import { CategoryService } from './CategoryService';
import ApiError from '../utils/ApiError';
import { ChangeTracker } from '../utils/ChangeTracker';
import { generateProductUuid } from '../shared/utils/uuidGenerator';
import { QRCodeService } from '../shared/services/barcode/QRCodeService';
import { emitAdminEvent, emitGlobalUserEvent } from '../socket';

const productCountCache = new MemoryCache({
  defaultTtlMs: 60 * 1000,
  maxKeys: 1000,
  name: 'productCountCache',
});

function enforceSmartPricing(data: Partial<IProduct>, existingProduct?: IProduct) {
  const isManual =
    data.isManualRentalPricing !== undefined
      ? data.isManualRentalPricing
      : existingProduct?.isManualRentalPricing;

  // If manual pricing is explicitly disabled, we overwrite. If explicitly enabled, we return.
  if (data.isManualRentalPricing === false) {
    // proceed with smart pricing overwrite
  } else if (isManual === true) {
    return;
  } else {
    // Auto-detect if explicit non-zero values were sent in case the flag was dropped
    const hasManualRental =
      data.rentalPricing &&
      (Number(data.rentalPricing.daily) > 0 ||
        Number(data.rentalPricing.weekly) > 0 ||
        Number(data.rentalPricing.monthly) > 0);
    const hasManualDeposit = data.securityDeposit !== undefined && Number(data.securityDeposit) > 0;

    if (hasManualRental || hasManualDeposit) {
      data.isManualRentalPricing = true;
      return;
    }
  }

  const price = data.price !== undefined ? Number(data.price) : Number(existingProduct?.price || 0);

  // Try to find category name from primaryCategory object if populated, or fallback
  let categoryName = '';
  if (data.primaryCategory) {
    categoryName =
      typeof data.primaryCategory === 'object' && (data.primaryCategory as any).name
        ? (data.primaryCategory as any).name
        : String(data.primaryCategory);
  } else if (existingProduct?.primaryCategory) {
    categoryName =
      typeof existingProduct.primaryCategory === 'object' &&
      (existingProduct.primaryCategory as any).name
        ? (existingProduct.primaryCategory as any).name
        : String(existingProduct.primaryCategory);
  }
  const category = categoryName.toLowerCase();

  if (price > 0 && category) {
    let dailyRate: number;
    let depositRate: number;

    if (category.includes('furniture')) {
      dailyRate = 0.04;
      depositRate = 0.3;
    } else if (category.includes('electronic')) {
      dailyRate = 0.06;
      depositRate = 0.5;
    } else if (category.includes('wedding decoration') || category.includes('wedding')) {
      dailyRate = 0.08;
      depositRate = 0.4;
    } else if (category.includes('camera')) {
      dailyRate = 0.1;
      depositRate = 0.6;
    } else {
      dailyRate = 0.05;
      if (price <= 5000) depositRate = 0.3;
      else if (price <= 25000) depositRate = 0.4;
      else if (price <= 100000) depositRate = 0.5;
      else depositRate = 0.6;
    }

    const daily = Math.round(price * dailyRate);
    const weekly = daily * 6;
    const monthly = daily * 16;
    const deposit = Math.round(price * depositRate);

    data.rentalPricing = {
      ...(data.rentalPricing || existingProduct?.rentalPricing || ({} as any)),
      daily,
      weekly,
      monthly,
    };
    data.securityDeposit = deposit;
  }
}

function normalizeProductImages(data: Partial<IProduct>, existingProduct?: IProduct) {
  const rawImages = Array.isArray(data.images) ? data.images : undefined;
  const imageSrc = typeof data.imageSrc === 'string' ? data.imageSrc.trim() : undefined;
  const existingImageSrc =
    typeof existingProduct?.imageSrc === 'string' ? existingProduct.imageSrc.trim() : undefined;

  const orderedImages = [...(imageSrc ? [imageSrc] : []), ...(rawImages || [])]
    .map((img) => (typeof img === 'string' ? img.trim() : ''))
    .filter(Boolean);
  const uniqueImages = Array.from(new Set(orderedImages));

  if (uniqueImages.length > 4) {
    throw new ApiError(400, 'A product can have a maximum of 4 images');
  }

  if (uniqueImages.length > 0) {
    data.imageSrc = uniqueImages[0];
    data.images = uniqueImages.slice(1, 4);
    return;
  }

  if (!existingProduct) {
    return;
  }

  if (rawImages && rawImages.length === 0 && !imageSrc) {
    data.images = [];
    return;
  }

  if (!imageSrc && rawImages === undefined && existingImageSrc) {
    data.imageSrc = existingImageSrc;
  }
}

async function resolveCategories(data: any) {
  // Frontend might send 'category' string or 'primaryCategory' string
  const primaryString = data.primaryCategory || data.category;
  if (typeof primaryString === 'string') {
    const matchedId = await CategoryService.intelligentMatch(primaryString);
    if (matchedId) {
      data.primaryCategory = matchedId;
    } else {
      // Auto-create safe fallback
      const fallbackCat = await Category.create({
        name: primaryString.trim(),
        slug: primaryString
          .trim()
          .replace(/[\s\W-]+/g, '-')
          .toLowerCase(),
        type: 'product',
        isActive: true,
      });
      data.primaryCategory = fallbackCat._id;
    }
  }

  // Handle secondaryCategories array of strings
  if (data.secondaryCategories && Array.isArray(data.secondaryCategories)) {
    const resolvedSec = [];
    for (const sec of data.secondaryCategories) {
      if (typeof sec === 'string') {
        const matchedId = await CategoryService.intelligentMatch(sec);
        if (matchedId) resolvedSec.push(matchedId);
      } else if (mongoose.Types.ObjectId.isValid(sec as any)) {
        resolvedSec.push(sec);
      }
    }
    data.secondaryCategories = resolvedSec;
  }
}

class ProductService {
  static async buildProductFilterQuery(queryParams: any, isAdmin: boolean = false) {
    const {
      category,
      search,
      featured,
      minPrice,
      maxPrice,
      material,
      collection,
      availableForRent,
      availableForPurchase,
      availabilityMode,
      spellcheck,
      bypassCorrection,
      ids,
      ...dynamicFilters
    } = queryParams;

    const filter: any = isAdmin ? {} : { isActive: true };

    if (ids) {
      const idArray = String(ids)
        .split(',')
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idArray.length > 0) {
        filter._id = { $in: idArray };
      }
    }

    if (category && String(category).toLowerCase() !== 'all') {
      const catMatchId = await CategoryService.intelligentMatch(String(category));
      if (catMatchId) {
        filter.$or = filter.$or || [];
        filter.$or.push({ primaryCategory: catMatchId }, { secondaryCategories: catMatchId });
      }
    }
    if (featured === 'true') filter.featured = true;

    // Rental filters
    if (availableForRent === 'true') {
      filter.rentalEnabled = true;
      filter.availabilityMode = { $in: ['rent_only', 'both'] };
    }
    if (availableForPurchase === 'true') {
      filter.availabilityMode = { $in: ['purchase_only', 'both'] };
    }
    if (availabilityMode && ['purchase_only', 'rent_only', 'both'].includes(availabilityMode)) {
      filter.availabilityMode = availabilityMode;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (material) {
      const materials = String(material)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (materials.length > 0)
        filter.material = {
          $in: materials.map((item) => new RegExp(`^${escapeRegex(item)}$`, 'i')),
        };
    }
    if (collection) {
      const collections = String(collection)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => Boolean(item) && item.toLowerCase() !== 'all');
      if (collections.length > 0) {
        const matchedCats = await Category.find({
          $or: [{ slug: { $in: collections } }, { name: { $in: collections } }],
        }).lean();
        if (matchedCats.length > 0) {
          const catIds = matchedCats.map((c) => c._id);
          filter.$or = filter.$or || [];
          filter.$or.push(
            { primaryCategory: { $in: catIds } },
            { secondaryCategories: { $in: catIds } },
          );
        }
      }
    }

    // Dynamic Filters (e.g. ?Color=Red,Blue or ?Size=M)
    const dynamicFilterOrs: any[] = [];
    Object.keys(dynamicFilters).forEach((key) => {
      // Ignore pagination and known sorts and special params
      if (['page', 'limit', 'skip', 'sort', 'coupon'].includes(key)) return;

      const values = String(dynamicFilters[key])
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      if (values.length > 0) {
        // Build regex for each value
        const valRegexes = values.map((v) => new RegExp(`^${escapeRegex(v)}$`, 'i'));

        dynamicFilterOrs.push({
          $or: [
            // Option 1: It's a tag
            { tags: { $in: valRegexes } },
            // Option 2: It's a variant where name matches key and value matches val
            {
              variants: {
                $elemMatch: {
                  name: new RegExp(`^${escapeRegex(key)}$`, 'i'),
                  value: { $in: valRegexes },
                },
              },
            },
          ],
        });
      }
    });

    if (dynamicFilterOrs.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...dynamicFilterOrs);
    }

    if (dynamicFilters.coupon) {
      const foundCoupon = await Coupon.findOne({
        code: String(dynamicFilters.coupon).toUpperCase(),
        isActive: true,
      }).lean();
      if (foundCoupon) {
        if (foundCoupon.targetType === 'categories' && foundCoupon.targetCategories?.length > 0) {
          const matchedCats = await Category.find({
            $or: [
              { slug: { $in: foundCoupon.targetCategories } },
              { name: { $in: foundCoupon.targetCategories } },
            ],
          }).lean();
          if (matchedCats.length > 0) {
            const catIds = matchedCats.map((c) => c._id);
            filter.$or = filter.$or || [];
            filter.$or.push(
              { primaryCategory: { $in: catIds } },
              { secondaryCategories: { $in: catIds } },
            );
          }
        } else if (
          foundCoupon.targetType === 'products' &&
          foundCoupon.targetProductIds?.length > 0
        ) {
          filter._id = { $in: foundCoupon.targetProductIds };
        }

        if (foundCoupon.minOrderAmount > 0) {
          filter.price = filter.price || {};
          filter.price.$gte = Math.max(filter.price.$gte || 0, foundCoupon.minOrderAmount);
        }
      }
    }

    let correctedQuery: string | undefined;
    const shouldSpellcheck = spellcheck !== 'false' && bypassCorrection !== 'true';

    if (search) {
      const aiAnalysis = await analyzeQueryWithAI(search);

      if (
        shouldSpellcheck &&
        aiAnalysis.correctedQuery &&
        aiAnalysis.correctedQuery.toLowerCase() !== search.toLowerCase()
      ) {
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

      // Apply category from AI if not manually set and it matches database taxonomy
      if (aiAnalysis.category && !category) {
        const dbCategories = await Category.find({ isActive: true })
          .distinct('name')
          .catch(() => [] as string[]);
        const matchedCategory = getMatchingProductCategory(aiAnalysis.category, dbCategories);
        if (matchedCategory) {
          filter.primaryCategory = new RegExp(`^${escapeRegex(matchedCategory)}$`, 'i');
        }
      }

      const allSearchTerms = [
        search,
        ...(shouldSpellcheck && aiAnalysis.correctedQuery ? [aiAnalysis.correctedQuery] : []),
        ...aiAnalysis.expandedTerms,
      ];
      const uniqueSearchTerms = [...new Set(allSearchTerms.filter(Boolean))];
      const regexPatterns = uniqueSearchTerms.map((t) => new RegExp(escapeRegex(t), 'i'));

      const searchOr = [
        { title: { $in: regexPatterns } },
        { teluguTitle: { $in: regexPatterns } },
        { material: { $in: regexPatterns } },
        { tags: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
      ];

      // Add category text search matching
      const matchingCats = await Category.find({ name: { $in: regexPatterns } }).lean();
      if (matchingCats.length > 0) {
        const catIds = matchingCats.map((c) => c._id);
        searchOr.push({ primaryCategory: { $in: catIds } } as any);
        searchOr.push({ secondaryCategories: { $in: catIds } } as any);
      }

      // Match colors if detected
      if (aiAnalysis.colors.length > 0) {
        searchOr.push({
          tags: { $in: aiAnalysis.colors.map((c) => new RegExp(escapeRegex(c), 'i')) },
        });
      }

      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or });
        delete filter.$or;
      }

      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    return { filter, correctedQuery };
  }

  static async getAllProducts(queryParams: any, isAdmin: boolean = false) {
    const { sort } = queryParams;
    const { page, limit, skip } = getPaginationOptions(queryParams);

    const { filter, correctedQuery } = await this.buildProductFilterQuery(queryParams, isAdmin);

    let sortOptions: any = { createdAt: -1, _id: 1 };
    if (sort) {
      if (sort === 'price_asc') sortOptions = { price: 1, _id: 1 };
      else if (sort === 'price_desc') sortOptions = { price: -1, _id: 1 };
      else if (sort === 'newest') sortOptions = { createdAt: -1, _id: 1 };
      else if (sort === 'rating') sortOptions = { rating: -1, _id: 1 };
    }

    const filterHash = JSON.stringify(filter);

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .select(
          isAdmin
            ? ''
            : '-description -seoTitle -seoDescription -customizationConfig -variants -dimensions -weight',
        )
        .populate('primaryCategory', 'name slug type')
        .populate('secondaryCategories', 'name slug type')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      productCountCache.getOrSet(filterHash, () => Product.countDocuments(filter)),
    ]);

    const response: any = formatPaginationResponse(products, totalCount, page, limit);
    response.correctedQuery = correctedQuery;
    return response;
  }

  static async getProductById(idOrSlug: string) {
    let product;
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);

    // Fetch the product first without updating the counter in DB
    if (isObjectId) {
      product = await Product.findById(idOrSlug)
        .populate('primaryCategory', 'name slug type')
        .populate('secondaryCategories', 'name slug type')
        .lean();
    } else {
      product = await Product.findOne({ slug: idOrSlug.toLowerCase() })
        .populate('primaryCategory', 'name slug type')
        .populate('secondaryCategories', 'name slug type')
        .lean();
    }

    if (!product || !product.isActive) return null;

    // Batch view counter updates using Redis to reduce DB write IOPS
    const productIdStr = product._id.toString();
    try {
      if (redisClient && redisClient.isReady) {
        const viewKey = `product:views:${productIdStr}`;
        const views = await redisClient.incr(viewKey);

        // If it's the first view in this batch, set an expiry to prevent orphaned keys
        if (views === 1) {
          await redisClient.expire(viewKey, 3600); // 1 hour max TTL
        }

        // Flush to DB every 10 views to reduce write frequency by 90%
        if (views >= 10) {
          await Product.findByIdAndUpdate(productIdStr, { $inc: { views: views } });
          await redisClient.del(viewKey);
        }
      } else {
        // Fallback to direct DB update if Redis is unavailable
        await Product.findByIdAndUpdate(productIdStr, { $inc: { views: 1 } });
      }
    } catch (err) {
      logger.warn(`Failed to increment product views in Redis for ${productIdStr}:`, err);
      // Failsafe DB update
      Product.findByIdAndUpdate(productIdStr, { $inc: { views: 1 } }).catch(() => {});
    }

    return product;
  }

  static async flushAllViewCounters() {
    try {
      if (!redisClient || !redisClient.isReady) return;

      const keys = await redisClient.keys('product:views:*');
      if (keys.length === 0) return;

      logger.info(`[PRODUCT VIEWS] Flushing ${keys.length} product view counters to DB...`);

      const pipeline = redisClient.multi();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      const ops: any[] = [];
      const delPipeline = redisClient.multi();

      keys.forEach((key, index) => {
        const viewsStr = results[index];
        if (viewsStr) {
          const views = parseInt(String(viewsStr), 10);
          const productId = key.split(':').pop();
          if (views > 0 && productId && mongoose.Types.ObjectId.isValid(productId)) {
            ops.push({
              updateOne: {
                filter: { _id: productId },
                update: { $inc: { views: views } },
              },
            });
            delPipeline.del(key);
          }
        }
      });

      if (ops.length > 0) {
        await Promise.all([Product.bulkWrite(ops), delPipeline.exec()]);
        logger.info(`[PRODUCT VIEWS] Successfully flushed ${ops.length} products`);
      }

      if (ops.length > 0) {
        await Product.bulkWrite(ops);
        logger.info(`[PRODUCT VIEWS] Successfully flushed ${ops.length} products`);
      }
    } catch (err) {
      logger.error('[PRODUCT VIEWS] Failed to flush view counters:', err);
    }
  }

  static async createProduct(data: Partial<IProduct>, actor?: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      normalizeProductImages(data);
      await resolveCategories(data);
      enforceSmartPricing(data);

      if (!data.productUuid) {
        data.productUuid = generateProductUuid();
      }

      if (!data.sku) {
        const categoryPrefix =
          data.primaryCategory && typeof data.primaryCategory === 'string'
            ? (data.primaryCategory as string).substring(0, 3).toUpperCase()
            : 'PRD';
        data.sku = `${categoryPrefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      }

      if (!data.barcode) {
        data.barcode = data.sku;
      }

      if (!data.qrCode) {
        data.qrCode = QRCodeService.generateProductQrPayload(data.productUuid, data.sku);
      }

      // Initialize inventory object
      if (!data.inventory) {
        data.inventory = {
          available: Number(data.stock) || 0,
          reserved: Number(data.reservedStock) || 0,
          production: 0,
          packing: 0,
          transit: 0,
          rental: Number(data.rentalStock) || 0,
          maintenance: 0,
          returned: 0,
          damaged: 0,
          lost: 0,
          qualityHold: 0,
        };
      }

      const product = new Product(data);
      const saved = await product.save({ session });

      // Verify the write succeeded
      const verified = await Product.findById(saved._id).session(session).lean();
      if (!verified) {
        throw new Error(
          `Product create verification failed: document ${saved._id} not found after save`,
        );
      }

      const allImages = saved.images || [];
      await MediaService.syncReferences('Product', saved._id, allImages, 'images');
      if (saved.imageSrc) {
        await MediaService.syncReferences('Product', saved._id, [saved.imageSrc], 'imageSrc');
      }

      await ChangeTracker.trackChange(
        'Product',
        saved._id,
        null,
        saved.toObject(),
        actor,
        'create',
      );

      if (saved.showInGallery) {
        await this.syncToGallery(saved, actor);
      }

      await session.commitTransaction();

      try {
        emitAdminEvent('product_update', { productId: saved._id });
        emitGlobalUserEvent('product_update', { productId: saved._id });
      } catch (e) {
        logger.warn('Failed to emit product update event', e);
      }

      logger.info('[CATEGORY CACHE] Purging distinct categories cache due to new product creation');
      categoryCache.delete('product:distinct_categories');
      productCountCache.clear();
      await bumpPublicCacheVersion();

      return saved;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async updateProduct(id: string, data: Partial<IProduct> & { __v?: number }, actor?: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const oldProduct = await Product.findById(id).populate('primaryCategory').session(session);
      if (!oldProduct) {
        await session.abortTransaction();
        return null;
      }

      // Optimistic concurrency: check version matches what the client sent
      if (data.__v !== undefined && data.__v !== oldProduct.__v) {
        await session.abortTransaction();
        throw new ApiError(
          409,
          'This product was modified by another user. Please refresh and try again.',
        );
      }

      normalizeProductImages(data, oldProduct as IProduct);
      await resolveCategories(data);
      enforceSmartPricing(data, oldProduct as IProduct);

      const product = await Product.findOneAndUpdate(
        { _id: id, __v: oldProduct.__v },
        { ...data, $inc: { __v: 1 } },
        { returnDocument: 'after', runValidators: true, session },
      );

      if (!product) {
        await session.abortTransaction();
        throw new ApiError(
          409,
          'This product was modified by another user. Please refresh and try again.',
        );
      }

      // Verify the write succeeded
      const verified = await Product.findById(product._id).session(session).lean();
      if (!verified) {
        throw new Error(
          `Product update verification failed: document ${product._id} not found after save`,
        );
      }

      await ChangeTracker.trackChange(
        'Product',
        product._id,
        oldProduct.toObject(),
        product.toObject(),
        actor,
        'update',
      );

      // Automatically sync references for primary and auxiliary images
      const allImages = product.images || [];
      await MediaService.syncReferences('Product', product._id, allImages, 'images');
      if (product.imageSrc) {
        await MediaService.syncReferences('Product', product._id, [product.imageSrc], 'imageSrc');
      } else {
        await MediaService.syncReferences('Product', product._id, [], 'imageSrc');
      }

      if (product.showInGallery) {
        await this.syncToGallery(product, actor);
      } else {
        await this.removeFromGallery(product._id, actor);
      }

      await session.commitTransaction();

      try {
        emitAdminEvent('product_update', { productId: product._id });
        emitGlobalUserEvent('product_update', { productId: product._id });
        if (oldProduct.stock !== product.stock) {
          emitAdminEvent('stock_update', { productId: product._id, stock: product.stock });
          emitGlobalUserEvent('stock_update', { productId: product._id, stock: product.stock });
        }
      } catch (e) {
        logger.warn('Failed to emit product update event', e);
      }

      logger.info('[CATEGORY CACHE] Purging distinct categories cache due to product update');
      categoryCache.delete('product:distinct_categories');
      productCountCache.clear();
      await bumpPublicCacheVersion();
      return product;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async deleteProduct(id: string, actor?: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const product = await Product.findById(id).session(session);
      if (!product) {
        await session.abortTransaction();
        return null;
      }

      // Soft delete
      product.isDeleted = true;
      product.deletedAt = new Date();
      product.deletedBy = actor
        ? {
            userId: actor.id || actor._id?.toString(),
            email: actor.email,
            role: actor.role,
          }
        : undefined;
      product.deletionReason = 'Deleted via productService';
      await product.save({ session });

      // Verify the write succeeded
      const verifiedDelete = await Product.findOne({ _id: id, isDeleted: true }).session(session);
      if (!verifiedDelete) {
        throw new Error(`Delete verification failed: Product ${id} was not marked as deleted`);
      }

      // Clean up gallery
      await this.removeFromGallery(product._id, actor);

      // Clean up User wishlist, cart, and recentlyViewed references to prevent orphan/dead links
      const User = require('../models/User').default || require('../models/User');
      await User.updateMany(
        {
          $or: [
            { wishlist: product._id },
            { 'cart.product': product._id },
            { 'recentlyViewed.product': product._id },
          ],
        },
        {
          $pull: {
            wishlist: product._id,
            cart: { product: product._id },
            recentlyViewed: { product: product._id },
          },
        },
        { session },
      );

      // Soft delete product reviews
      const Review = require('../models/Review').default || require('../models/Review');
      const reviews = await Review.find({ product: product._id }).session(session);
      for (const review of reviews) {
        review.isDeleted = true;
        review.deletedAt = new Date();
        review.deletedBy = actor
          ? {
              userId: actor.id || actor._id?.toString(),
              email: actor.email,
              role: actor.role,
            }
          : undefined;
        review.deletionReason = 'Cascading soft delete from product';
        await review.save({ session });
      }

      await session.commitTransaction();

      try {
        emitAdminEvent('product_update', { productId: product._id });
        emitGlobalUserEvent('product_update', { productId: product._id });
      } catch (e) {
        logger.warn('Failed to emit product update event', e);
      }

      logger.info('[CATEGORY CACHE] Purging distinct categories cache due to product deletion');
      categoryCache.delete('product:distinct_categories');
      productCountCache.clear();
      await bumpPublicCacheVersion();
      return product;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async syncToGallery(product: any, _actor?: any) {
    try {
      let galleryItem = await Gallery.findOne({ linkedProducts: product._id });
      if (galleryItem) {
        galleryItem.title = product.title;
        galleryItem.teluguTitle = product.teluguTitle;
        galleryItem.primaryCategory = product.primaryCategory;
        galleryItem.secondaryCategories = product.secondaryCategories;
        galleryItem.image = product.imageSrc;
        galleryItem.description = product.description;
        galleryItem.tags = product.tags || [];
        galleryItem.isActive = product.isActive;
        await galleryItem.save();
      } else {
        galleryItem = new Gallery({
          title: product.title,
          teluguTitle: product.teluguTitle,
          primaryCategory: product.primaryCategory,
          secondaryCategories: product.secondaryCategories,
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

  static async removeFromGallery(productId: any, actor?: any) {
    try {
      const items = await Gallery.find({ linkedProducts: productId });
      for (const item of items) {
        await item.softDelete(actor, 'Cascading soft delete from product');
      }
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
    const cached = categoryCache.get<any[]>(cacheKey);
    if (cached !== null) {
      logger.info('[CATEGORY CACHE] Cache Hit for distinct categories');
      return cached;
    }

    logger.info('[CATEGORY CACHE] Cache Miss. Fetching distinct categories from database');
    // Fetch unique primaryCategory IDs from active products
    const categoryIds = await Product.distinct('primaryCategory', { isActive: true });

    // Populate them using the Category model to get the { name, slug } objects expected by UI
    const categories = await Category.find({ _id: { $in: categoryIds }, isActive: true })
      .select('name slug')
      .lean();

    // Transform to simple array of names to maintain backward compatibility with some simple frontends,
    // though the UI might prefer the objects. Let's return just names for now to be safe,
    // or better, if the UI expects strings, return strings.
    // The older code returned strings. We will return strings.
    const result = categories
      .map((c) => c.name)
      .filter(Boolean)
      .sort();

    categoryCache.set(cacheKey, result);
    return result;
  }
}

export default ProductService;
// Triggered restart to clear in-memory categoryCache
