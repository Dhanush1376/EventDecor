import { Request, Response } from 'express';
import Coupon from '../models/Coupon';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

export const getCoupons = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(true, 'Coupons fetched', coupons));
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
  const coupon = new Coupon(req.body);
  await coupon.save();
  res.status(201).json(new ApiResponse(true, 'Coupon created', coupon));
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');
  if (orderAmount < coupon.minOrderAmount) throw new ApiError(400, `Minimum order amount is ₹${coupon.minOrderAmount}`);

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  res.status(200).json(new ApiResponse(true, 'Coupon applied', {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    calculatedDiscount: Math.round(discount),
    finalAmount: Math.round(orderAmount - discount),
  }));
});
