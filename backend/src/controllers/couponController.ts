import { Request, Response } from 'express';
import Coupon from '../models/Coupon';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { setPaginationHeaders } from '../utils/paginationHeaders';
import { ADMIN_ROLES } from '../config/adminConfig';

export const getCoupons = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = ADMIN_ROLES.includes((req as any).user?.role);
  const { page, limit, skip } = getPaginationOptions(req.query);

  const filter = isAdmin ? {} : { isActive: true, expiryDate: { $gt: new Date() } };

  const [coupons, totalCount] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
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
    expiryDate: req.body.expiryDate,
    usageLimit: req.body.usageLimit,
    isActive: req.body.isActive,
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
    expiryDate: req.body.expiryDate,
    usageLimit: req.body.usageLimit,
    isActive: req.body.isActive,
  };
  Object.keys(dto).forEach((k) => (dto as any)[k] === undefined && delete (dto as any)[k]);

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { $set: dto },
    { new: true, runValidators: true },
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
    throw new ApiError(400, `Minimum order amount is ₹${coupon.minOrderAmount}`);

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
