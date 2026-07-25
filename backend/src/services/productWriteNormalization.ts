import mongoose from 'mongoose';
import { IProduct } from '../models/Product';
import Category from '../models/Category';
import { CategoryService } from './CategoryService';
import ApiError from '../utils/ApiError';
import { NormalizationEngine } from './NormalizationEngine';

// Product write-path normalization helpers extracted from productService.ts:
// smart rental pricing, image de-duplication/limits, and category resolution.
// Pure input-shaping used by ProductService create/update — no query/cache concerns.

export function enforceSmartPricing(data: Partial<IProduct>, existingProduct?: IProduct) {
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

export function normalizeProductImages(data: Partial<IProduct>, existingProduct?: IProduct) {
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

export async function resolveCategories(data: any) {
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

export async function normalizeProductAttributes(data: Partial<IProduct>) {
  if (data.variants?.length) {
    data.variants = await NormalizationEngine.normalizeVariants(data.variants);
  }

  if (data.tags?.length || typeof data.tags === 'string') {
    const tagArray =
      typeof data.tags === 'string'
        ? (data.tags as string)
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : data.tags;
    const { tagIds, displayTags } = await NormalizationEngine.normalizeTags(tagArray as string[]);
    data.tags = displayTags;
    data.tagIds = tagIds;
  }

  if (data.material) {
    data.material = await NormalizationEngine.normalizeMaterial(data.material);
  }
}
