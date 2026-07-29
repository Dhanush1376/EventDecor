import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../../models/User';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import Product from '../../models/Product';
import { setPaginationHeaders } from '../../utils/paginationHeaders';
import {
  cacheCart,
  invalidateUserSessionCaches,
  getCachedSessionJson,
  sessionKeys,
} from '../../utils/cache/userSessionCache';
import { UserService } from '../../services/users/userService';
import { UserAddressService } from '../../services/users/UserAddressService';
import { UserWishlistService } from '../../services/users/UserWishlistService';
import { UserCartService } from '../../services/users/UserCartService';
import { TeamInviteService } from '../../services/users/TeamInviteService';
import logger from '../../config/logger';

/** @internal Forensic experiment helper — hash identifiers for safe logging */
const forensicHashId = (id: string) =>
  crypto.createHash('sha256').update(id).digest('hex').slice(0, 12);

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { role, search } = req.query;
  const filter: any = {};

  if (role) {
    if (role === 'user' || role === 'customer') {
      filter.role = { $in: ['user', 'customer'] };
    } else {
      filter.role = role;
    }
  } else {
    // If no role filter is provided, exclude staff from general customer search
    filter.role = { $in: ['user', 'customer'] };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [usersRaw, totalCount] = await Promise.all([
    User.find(filter)
      .select('name email phone role loyaltyTier walletBalance createdAt updatedAt isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = usersRaw.map((u) => u._id);
  const Address = require('../../models/Address').default || require('../../models/Address');
  // Fetch default address, or if not found, just fetch any address in a real-world scenario, but default is best.
  // Actually, to ensure we get at least one location if default is missing, we could fetch all and group, but
  // fetching isDefault: true is standard. If none, we'll try to get the first one per user.
  const addresses = await Address.find({ user: { $in: userIds } }).lean();

  const addressMap = new Map();
  addresses.forEach((a: any) => {
    // Prefer isDefault, or if not set yet, just set it
    if (!addressMap.has(a.user.toString()) || a.isDefault) {
      addressMap.set(a.user.toString(), a);
    }
  });

  const users = usersRaw.map((u) => ({
    ...u,
    addresses: addressMap.has(u._id.toString()) ? [addressMap.get(u._id.toString())] : [],
  }));

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Users fetched',
        formatPaginationResponse(users, totalCount, page, limit),
      ),
    );
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const user = await User.findById(req.params.id).lean();
  if (!user) throw new ApiError(404, 'User not found');

  const Order = require('../../models/Order').default || require('../../models/Order');
  const orders = await Order.find({ user: user._id })
    .select(
      'totalAmount status createdAt paymentStatus paymentMethod deliveryStatus razorpayOrderId',
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  (user as any).orders = orders;

  // We fetch total order count directly from the Order model if needed for full pagination,
  // but to maintain API compatibility we return the user document.
  res.status(200).json(new ApiResponse(true, 'User fetched', user));
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const actorRole = (req as any).user!.role;

  const user = await UserService.updateUserRole(req.params.id as string, role, actorRole);
  res.status(200).json(new ApiResponse(true, 'User role updated', user));
});

export const getProductCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await Product.distinct('category', { isActive: true });
  res.status(200).json(new ApiResponse(true, 'Categories fetched', ['All', ...categories.sort()]));
});

// Profile Management
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id).select('-password').lean();
  if (!user) throw new ApiError(404, 'User not found');
  res.status(200).json(new ApiResponse(true, 'Profile fetched', user));
});

export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await UserService.updateProfile(req.user.id, req.body);
  await invalidateUserSessionCaches(String(req.user.id));
  res.status(200).json(new ApiResponse(true, 'Profile updated successfully', user));
});

// Address Management
export const getAddresses = asyncHandler(async (req: any, res: Response) => {
  const addresses = await UserAddressService.getAddresses(req.user.id);
  res.status(200).json(new ApiResponse(true, 'Addresses fetched', addresses));
});

export const addAddress = asyncHandler(async (req: any, res: Response) => {
  const addresses = await UserAddressService.addAddress(req.user.id, req.user.email, req.body);
  res.status(201).json(new ApiResponse(true, 'Address added', addresses));
});

export const updateAddress = asyncHandler(async (req: any, res: Response) => {
  const addresses = await UserAddressService.updateAddress(
    req.user.id,
    req.params.addressId,
    req.user.email,
    req.body,
  );
  res.status(200).json(new ApiResponse(true, 'Address updated', addresses));
});

export const deleteAddress = asyncHandler(async (req: any, res: Response) => {
  const addresses = await UserAddressService.deleteAddress(req.user.id, req.params.addressId);
  res.status(200).json(new ApiResponse(true, 'Address deleted', addresses));
});

export const setDefaultAddress = asyncHandler(async (req: any, res: Response) => {
  const addresses = await UserAddressService.setDefaultAddress(req.user.id, req.params.addressId);
  res.status(200).json(new ApiResponse(true, 'Default address updated', addresses));
});

// Wishlist Management
export const getWishlist = asyncHandler(async (req: any, res: Response) => {
  const result = await UserWishlistService.getWishlist(req.user.id);
  if (result.cacheStatus === 'HIT') {
    res.setHeader('X-Session-Cache', 'HIT');
  } else {
    res.setHeader('X-Session-Cache', 'MISS');
  }
  res.status(200).json(new ApiResponse(true, 'Wishlist fetched', result.data));
});

export const toggleWishlist = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.body;
  const result = await UserWishlistService.toggleWishlist(req.user.id, productId);
  await invalidateUserSessionCaches(String(req.user.id));
  res.status(200).json(new ApiResponse(true, result.action, result.wishlist));
});

// Compute and validate cart moved to UserService

export const getCart = asyncHandler(async (req: any, res: Response) => {
  const userId = String(req.user.id);
  const requestId = crypto.randomBytes(4).toString('hex');

  // CART_CACHE_BYPASS=true re-enables the direct-to-MongoDB diagnostic path
  // used while investigating cache-related cart inconsistencies.
  const bypassCache = process.env.CART_CACHE_BYPASS === 'true';

  if (!bypassCache) {
    const cached = await getCachedSessionJson<any>(sessionKeys.cart(userId));
    if (cached) {
      res.setHeader('X-Session-Cache', 'HIT');
      res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
      return res.status(200).json(new ApiResponse(true, 'Cart fetched', cached));
    }
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  const cartDetails = await UserService.computeAndValidateCart(user);

  if (!bypassCache) {
    await cacheCart(userId, cartDetails);
  }

  logger.debug('[CART_FORENSIC][DB_READ]', {
    requestId,
    hashedUserId: forensicHashId(userId),
    rawCartItemCount: Array.isArray(user.cart) ? user.cart.length : 0,
    computedPurchaseItemCount: cartDetails.purchaseCart?.items?.length ?? 0,
    computedRentalItemCount: cartDetails.rentalCart?.items?.length ?? 0,
  });

  res.setHeader('X-Session-Cache', bypassCache ? 'BYPASS' : 'MISS');
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.status(200).json(new ApiResponse(true, 'Cart fetched', cartDetails));
});

export const addToCart = asyncHandler(async (req: any, res: Response) => {
  const { productId, quantity, type, rentalInfo } = req.body;
  const requestId = crypto.randomBytes(4).toString('hex');

  const updatedUser = await UserCartService.addToCart(
    req.user.id,
    productId,
    quantity,
    type,
    rentalInfo,
  );

  // Forensic DB write logging
  logger.debug('[CART_FORENSIC][DB_WRITE]', {
    requestId,
    hashedUserId: forensicHashId(String(req.user.id)),
    mongoUserDocumentIdHash: forensicHashId(String(updatedUser._id)),
    rawCartItemCount: Array.isArray(updatedUser.cart) ? updatedUser.cart.length : 0,
    addedProductIdHash: forensicHashId(productId),
    timestamp: Date.now(),
  });

  // Redis invalidation and caching with forensic requestId for internal logging
  await invalidateUserSessionCaches(String(req.user.id), requestId);
  const cartDetails = await UserService.computeAndValidateCart(updatedUser);
  await cacheCart(String(req.user.id), cartDetails, requestId);
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');

  res.locals.forensicRequestId = requestId;
  logger.debug('[CART_RESPONSE_TRACE][CONTROLLER_OUTPUT]', {
    requestId,
    purchaseItemCount: cartDetails.purchaseCart?.items?.length ?? 0,
    rentalItemCount: cartDetails.rentalCart?.items?.length ?? 0,
    responseDataKeys: Object.keys(cartDetails || {}),
  });

  res.status(200).json(new ApiResponse(true, 'Cart updated', cartDetails));
});

export const syncCart = asyncHandler(async (req: any, res: Response) => {
  const { cartItems } = req.body;
  const user = await UserCartService.syncCart(req.user.id, cartItems);
  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await UserService.computeAndValidateCart(user);
  await cacheCart(String(req.user.id), cartDetails);
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.status(200).json(new ApiResponse(true, 'Cart synced successfully', cartDetails));
});

export const mergeCart = asyncHandler(async (req: any, res: Response) => {
  const { cartItems } = req.body;
  const { cart, droppedItems } = await UserCartService.mergeCart(req.user.id, cartItems);

  // Invalidate and rebuild the cache so subsequent queries get the merged cart
  await invalidateUserSessionCaches(String(req.user.id));
  const user = await User.findById(req.user.id);
  const cartDetails = await UserService.computeAndValidateCart(user);
  await cacheCart(String(req.user.id), cartDetails);

  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.json({ success: true, data: { cart, droppedItems } });
});

export const removeFromCart = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.params;
  const user = await UserCartService.removeFromCart(req.user.id, productId);
  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await UserService.computeAndValidateCart(user);
  await cacheCart(String(req.user.id), cartDetails);
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.status(200).json(new ApiResponse(true, 'Removed from cart', cartDetails));
});

// Recently Viewed Products tracking
export const getRecentlyViewed = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'recentlyViewed.product',
      populate: { path: 'primaryCategory', select: 'name' },
    })
    .lean();
  if (!user) throw new ApiError(404, 'User not found');

  const list = (user.recentlyViewed || []).filter((item: any) => item.product != null);
  res.status(200).json(new ApiResponse(true, 'Recently viewed list fetched', list));
});

export const trackRecentlyViewed = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.body;
  const recentlyViewed = await UserService.trackRecentlyViewed(req.user.id, productId);
  res.status(200).json(new ApiResponse(true, 'Product view tracked', recentlyViewed));
});

// Profile Preferences Management
export const updatePreferences = asyncHandler(async (req: any, res: Response) => {
  const { notificationPreferences, accountPreferences } = req.body;
  const preferences = await UserService.updatePreferences(
    req.user.id,
    notificationPreferences,
    accountPreferences,
  );
  res.status(200).json(new ApiResponse(true, 'Preferences updated successfully', preferences));
});

// Upload and Persist Avatar
export const uploadAvatarController = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file');
  }

  const avatar = await UserService.uploadAvatar(req.user.id, req.file);
  await invalidateUserSessionCaches(String(req.user.id));
  res.status(200).json(new ApiResponse(true, 'Avatar uploaded successfully', { avatar }));
});

// Get all team members & invites
export const getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const data = await TeamInviteService.getTeamMembers(skip, limit);

  setPaginationHeaders(res, data.totalCount, page, limit);
  res.status(200).json(
    new ApiResponse(true, 'Team data fetched', {
      members: data.members,
      invites: data.invites,
      pagination: {
        memberCount: data.memberCount,
        inviteCount: data.inviteCount,
        page,
        limit,
        totalCount: data.totalCount,
      },
    }),
  );
});

export const inviteTeamMember = asyncHandler(async (req: any, res: Response) => {
  const { email, role, permissions } = req.body;
  if (!email || !role) {
    throw new ApiError(400, 'Email and Role are required');
  }

  const invite = await TeamInviteService.inviteTeamMember(email, role, permissions, req.user.id);

  res.status(201).json(new ApiResponse(true, 'Invitation sent successfully', invite));
});

// Cancel team invitation
export const cancelTeamInvite = asyncHandler(async (req: Request, res: Response) => {
  await TeamInviteService.cancelTeamInvite(req.params.id as string);
  res.status(200).json(new ApiResponse(true, 'Invitation cancelled successfully'));
});

// Public: Get invite details by token
export const getInviteDetailsByToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Invite token is required');

  const invite = await TeamInviteService.getInviteDetailsByToken(token as string);
  res.status(200).json(new ApiResponse(true, 'Invitation details loaded', invite));
});

// Public: Respond to invite
export const respondToInvite = asyncHandler(async (req: any, res: Response) => {
  const { token, status } = req.body;
  if (!token || !['accepted', 'declined'].includes(status)) {
    throw new ApiError(400, 'Valid token and response status are required');
  }

  const result = await TeamInviteService.respondToInvite(String(token), status);
  res
    .status(200)
    .json(
      new ApiResponse(true, `Invitation ${result.status} successfully`, { status: result.status }),
    );
});
