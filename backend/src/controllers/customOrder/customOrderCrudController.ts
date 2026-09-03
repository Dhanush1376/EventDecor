import { Request, Response } from 'express';
import CustomOrder from '../../models/CustomOrder';
import Product from '../../models/Product';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { ADMIN_ROLES } from '../../config/adminConfig';
import mongoose from 'mongoose';

export const submitCustomOrder = asyncHandler(async (req: Request, res: Response) => {
  const { CustomOrderService } = require('../../services/customOrderService');
  const order = await CustomOrderService.submitCustomOrder(req.body, (req as any).user);
  res.status(201).json(new ApiResponse(true, 'Custom order request lodged successfully', order));
});

export const submitProductCustomization = asyncHandler(async (req: Request, res: Response) => {
  const { CustomOrderService } = require('../../services/customOrderService');
  const order = await CustomOrderService.submitProductCustomization(req.body, (req as any).user);
  res
    .status(201)
    .json(new ApiResponse(true, 'Product customization request submitted successfully', order));
});

// 3. Save Draft (Customer)
export const saveDraft = asyncHandler(async (req: Request, res: Response) => {
  const {
    productId,
    customizationData,
    customRequirements,
    files,
    referenceImages,
    costEstimation,
    draftId,
  } = req.body;

  const draftData: Record<string, unknown> = {
    customer: (req as any).user._id || (req as any).user.id,
    customerEmail: (req as any).user.email || '',
    customerName: (req as any).user.name,
    customerPhone: (req as any).user.phone,
    occasion: 'Product Customization',
    productType: 'Draft',
    isDraft: true,
    customizationData: customizationData || [],
    customRequirements,
    files: files || [],
    referenceImages: referenceImages || [],
    costEstimation: costEstimation || {},
  };

  // Snapshot the product if provided
  if (productId) {
    const product = await Product.findById(productId);
    if (product) {
      draftData.productId = product._id;
      draftData.productSnapshot = {
        productId: product._id.toString(),
        title: product.title,
        imageSrc: product.imageSrc,
        category: product.primaryCategory?.toString(),
        price: product.price,
        description: product.description,
        variants: product.variants?.map((v: any) => ({
          name: v.name,
          value: v.value,
          price: v.price,
        })),
        material: product.material,
        dimensions: product.dimensions,
      };
      draftData.productType = product.primaryCategory || 'Custom Product';
    }
  }

  let draft;
  if (draftId) {
    // Update existing draft
    draft = await CustomOrder.findOneAndUpdate(
      { _id: draftId, customer: (req as any).user._id || (req as any).user.id, isDraft: true },
      { $set: draftData },
      { returnDocument: 'after' },
    );
    if (!draft) {
      res.status(404).json(new ApiResponse(false, 'Draft not found'));
      return;
    }
  } else {
    // Create new draft
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const drafts = await CustomOrder.create([draftData], { session });
      draft = drafts[0];
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  res.status(200).json(new ApiResponse(true, 'Draft saved successfully', draft));
});

// 4. Get My Drafts (Customer)
export const getMyDrafts = asyncHandler(async (req: Request, res: Response) => {
  const drafts = await CustomOrder.find({
    customer: (req as any).user._id || (req as any).user.id,
    isDraft: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json(new ApiResponse(true, 'Drafts retrieved', drafts));
});

// 5. Delete Draft (Customer)
export const deleteDraft = asyncHandler(async (req: Request, res: Response) => {
  const draft = await CustomOrder.findOneAndDelete({
    _id: req.params.id,
    customer: (req as any).user._id || (req as any).user.id,
    isDraft: true,
  });

  if (!draft) {
    res.status(404).json(new ApiResponse(false, 'Draft not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Draft deleted successfully'));
});

// 6. Get My Custom Orders (Customer)
export const getMyCustomOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id || (req as any).user?.id;
  const orders = await CustomOrder.find({ customer: userId, isDraft: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(new ApiResponse(true, 'My custom orders synced', orders));
});

// 7. Get Single Custom Order (Customer or Admin)
export const getSingleCustomOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order details not found'));
    return;
  }

  // Ensure security boundaries
  if (
    !ADMIN_ROLES.includes((req as any).user.role as any) &&
    order.customer?.toString() !== ((req as any).user._id?.toString() || (req as any).user.id)
  ) {
    res.status(403).json(new ApiResponse(false, 'Unauthorized view access restricted'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Custom order fetched', order));
});
