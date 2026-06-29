import { Request, Response } from 'express';
import Coupon from '../../models/Coupon';
import Product from '../../models/Product';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { setPaginationHeaders } from '../../utils/paginationHeaders';
import { ADMIN_ROLES } from '../../config/adminConfig';

export const getCoupons = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = ADMIN_ROLES.includes((req as any).user?.role);
  const { page, limit, skip } = getPaginationOptions(req.query);

  const filter = isAdmin ? {} : { isActive: true, expiryDate: { $gt: new Date() } };

  const [coupons, totalCount] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  setPaginationHeaders(res, totalCount, page, limit);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Coupons fetched',
        formatPaginationResponse(coupons, totalCount, page, limit),
      ),
    );
});

export const getCouponByCode = asyncHandler(async (req: Request, res: Response) => {
  const code = (req.params.code as string)?.toUpperCase();
  if (!code) throw new ApiError(400, 'Coupon code is required');

  const coupon = await Coupon.findOne({ code, isActive: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found or expired');

  // Validate expiry and usage
  if (new Date() > coupon.expiryDate) {
    throw new ApiError(400, 'Coupon has expired');
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'Coupon usage limit reached');
  }

  res.status(200).json(new ApiResponse(true, 'Coupon is valid', coupon));
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const dto = {
    code: req.body.code,
    description: req.body.description,
    discountType: req.body.discountType,
    discountValue: req.body.discountValue,
    minOrderAmount: req.body.minOrderAmount,
    maxDiscount: req.body.maxDiscount,
    startDate: req.body.startDate,
    expiryDate: req.body.expiryDate,
    usageLimit: req.body.usageLimit,
    isActive: req.body.isActive,
    targetType: req.body.targetType,
    targetProductIds: req.body.targetProductIds,
    targetCategories: req.body.targetCategories,
    targetUserTiers: req.body.targetUserTiers,
    displayLocations: req.body.displayLocations,
    isFeatured: req.body.isFeatured,
    isAutoApply: req.body.isAutoApply,
    cashbackPercentage: req.body.cashbackPercentage,
    cashbackFixed: req.body.cashbackFixed,
    stackingRule: req.body.stackingRule,
    priority: req.body.priority,
  };
  Object.keys(dto).forEach((k) => (dto as any)[k] === undefined && delete (dto as any)[k]);
  const coupon = new Coupon(dto);
  await coupon.save();
  res.status(201).json(new ApiResponse(true, 'Coupon created', coupon));
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const dto = {
    code: req.body.code,
    description: req.body.description,
    discountType: req.body.discountType,
    discountValue: req.body.discountValue,
    minOrderAmount: req.body.minOrderAmount,
    maxDiscount: req.body.maxDiscount,
    startDate: req.body.startDate,
    expiryDate: req.body.expiryDate,
    usageLimit: req.body.usageLimit,
    isActive: req.body.isActive,
    targetType: req.body.targetType,
    targetProductIds: req.body.targetProductIds,
    targetCategories: req.body.targetCategories,
    targetUserTiers: req.body.targetUserTiers,
    displayLocations: req.body.displayLocations,
    isFeatured: req.body.isFeatured,
    isAutoApply: req.body.isAutoApply,
    cashbackPercentage: req.body.cashbackPercentage,
    cashbackFixed: req.body.cashbackFixed,
    stackingRule: req.body.stackingRule,
    priority: req.body.priority,
  };
  Object.keys(dto).forEach((k) => (dto as any)[k] === undefined && delete (dto as any)[k]);

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { $set: dto },
    { returnDocument: 'after', runValidators: true },
  );
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.status(200).json(new ApiResponse(true, 'Coupon updated', coupon));
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  res.status(200).json(new ApiResponse(true, 'Coupon deleted', coupon));
});

export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const code = (req.body.code as string)?.toUpperCase();
  const { orderAmount } = req.body;
  if (!code) throw new ApiError(400, 'Coupon code is required');

  const coupon = await Coupon.findOne({ code, isActive: true });
  if (!coupon) throw new ApiError(404, 'Invalid coupon code');

  if (new Date() > coupon.expiryDate) throw new ApiError(400, 'Coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    throw new ApiError(400, 'Coupon usage limit reached');

  // Bug-13: Per-User Usage Limit Check
  const alreadyUsed = coupon.usedBy?.some((u) => String(u.userId) === String((req as any).user.id));
  if (alreadyUsed) {
    throw new ApiError(400, 'You have already used this coupon.');
  }

  if (orderAmount < coupon.minOrderAmount)
    throw new ApiError(400, `Minimum order amount is â‚¹${coupon.minOrderAmount}`);

  const rawDiscount =
    coupon.discountType === 'percentage'
      ? (orderAmount * coupon.discountValue) / 100
      : coupon.discountValue;
  const discount =
    coupon.discountType === 'percentage' && coupon.maxDiscount
      ? Math.min(rawDiscount, coupon.maxDiscount)
      : rawDiscount;

  res.status(200).json(
    new ApiResponse(true, 'Coupon applied', {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      calculatedDiscount: Math.round(discount),
      finalAmount: Math.round(orderAmount - discount),
    }),
  );
});

export const getProductCoupons = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const user = (req as any).user;

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const now = new Date();
  const query: any = {
    isActive: true,
    expiryDate: { $gt: now },
    startDate: { $lte: now },
  };

  const allCoupons = await Coupon.find(query).lean();

  const activeCoupons = allCoupons.filter((coupon) => {
    if (coupon.usageLimit !== undefined && coupon.usageLimit !== null) {
      if (coupon.usedCount >= coupon.usageLimit) {
        return false;
      }
    }
    if (user && coupon.usedBy) {
      const alreadyUsed = coupon.usedBy.some((u) => String(u.userId) === String(user.id));
      if (alreadyUsed) {
        return false;
      }
    }
    return true;
  });

  const tier1: any[] = [];
  const tier2: any[] = [];
  const tier3: any[] = [];

  for (const coupon of activeCoupons) {
    if (coupon.targetType === 'products') {
      const isTargetProduct = coupon.targetProductIds?.some(
        (id) => String(id) === String(product._id),
      );
      if (isTargetProduct) {
        tier1.push(coupon);
      }
    } else if (coupon.targetType === 'categories') {
      const isTargetCategory = coupon.targetCategories?.some(
        (cat) => String(cat) === String(product.primaryCategory),
      );
      if (isTargetCategory) {
        tier1.push(coupon);
      }
    } else if (coupon.targetType === 'tiers') {
      if (user && user.loyaltyTier) {
        const isTargetTier = coupon.targetUserTiers?.some(
          (tier) => tier.toLowerCase() === user.loyaltyTier.toLowerCase(),
        );
        if (isTargetTier) {
          tier1.push(coupon);
        }
      }
    } else if (coupon.targetType === 'all') {
      if (coupon.minOrderAmount > 0) {
        tier2.push(coupon);
      } else {
        tier3.push(coupon);
      }
    }
  }

  // Sort Tier 1:
  // 1. Highest discount value (discountValue descending)
  // 2. Percentage over fixed (percentage first)
  // 3. Coupon Priority (priority descending)
  tier1.sort((a, b) => {
    if (b.discountValue !== a.discountValue) {
      return b.discountValue - a.discountValue;
    }
    if (a.discountType !== b.discountType) {
      return a.discountType === 'percentage' ? -1 : 1;
    }
    return (b.priority || 0) - (a.priority || 0);
  });

  // Sort Tier 2:
  // 1. Lower minimum purchase requirement first (minOrderAmount ascending)
  // 2. If equal, highest discount value (discountValue descending)
  tier2.sort((a, b) => {
    if (a.minOrderAmount !== b.minOrderAmount) {
      return a.minOrderAmount - b.minOrderAmount;
    }
    return b.discountValue - a.discountValue;
  });

  // Sort Tier 3:
  // 1. Highest discount value (discountValue descending)
  // 2. Coupon Priority (priority descending)
  tier3.sort((a, b) => {
    if (b.discountValue !== a.discountValue) {
      return b.discountValue - a.discountValue;
    }
    return (b.priority || 0) - (a.priority || 0);
  });

  res.status(200).json(
    new ApiResponse(true, 'Product coupons fetched and prioritized successfully', {
      tier1,
      tier2,
      tier3,
      all: [...tier1, ...tier2, ...tier3],
    }),
  );
});
