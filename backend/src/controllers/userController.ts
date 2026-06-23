import { Request, Response } from 'express';
import User from '../models/User';
import { STAFF_ROLES } from '../config/adminConfig';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import Product from '../models/Product';
import TeamInvite from '../models/TeamInvite';
import { canonicalizeEmail } from '../utils/email/emailHelper';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';
import logger from '../config/logger';
import { setPaginationHeaders } from '../utils/paginationHeaders';
import {
  cacheCart,
  cacheWishlist,
  getCachedSessionJson,
  invalidateUserSessionCaches,
  sessionKeys,
} from '../utils/cache/userSessionCache';
import { UserService } from '../services/users/userService';

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

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select('name email phone role loyaltyTier walletBalance createdAt updatedAt isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

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

  const Order = require('../models/Order').default || require('../models/Order');
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
  const { name, email, phone, gender, dateOfBirth } = req.body;

  if (email) {
    const cleanEmail = canonicalizeEmail(email);
    const existingUser = await User.findOne({ email: cleanEmail, _id: { $ne: req.user.id } });
    if (existingUser) {
      throw new ApiError(400, 'An account with this email address already exists');
    }
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = canonicalizeEmail(email);
  if (phone !== undefined) user.phone = phone;
  if (gender !== undefined) user.gender = gender;
  if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

  await user.save();
  await invalidateUserSessionCaches(String(req.user.id));
  res.status(200).json(new ApiResponse(true, 'Profile updated successfully', user));
});

// Address Management
export const getAddresses = asyncHandler(async (req: any, res: Response) => {
  const Address = require('../models/Address').default;
  const addresses = await Address.find({ user: req.user.id }).lean();
  res.status(200).json(new ApiResponse(true, 'Addresses fetched', addresses));
});

export const addAddress = asyncHandler(async (req: any, res: Response) => {
  const Address = require('../models/Address').default;
  const existingAddressesCount = await Address.countDocuments({ user: req.user.id });

  const email = req.body.email || req.user.email;
  const country = req.body.country || 'India';

  await Address.create({
    ...req.body,
    email,
    country,
    user: req.user.id,
    isDefault: existingAddressesCount === 0,
  });

  const addresses = await Address.find({ user: req.user.id });
  res.status(201).json(new ApiResponse(true, 'Address added', addresses));
});

export const updateAddress = asyncHandler(async (req: any, res: Response) => {
  const Address = require('../models/Address').default;

  const updateData = { ...req.body };
  if (updateData.email === undefined && req.user.email) {
    updateData.email = req.user.email;
  }
  if (updateData.country === undefined) {
    updateData.country = 'India';
  }

  const address = await Address.findOneAndUpdate(
    { _id: req.params.addressId, user: req.user.id },
    updateData,
    { returnDocument: 'after' },
  );

  if (!address) throw new ApiError(404, 'Address not found');

  const addresses = await Address.find({ user: req.user.id });
  res.status(200).json(new ApiResponse(true, 'Address updated', addresses));
});

export const deleteAddress = asyncHandler(async (req: any, res: Response) => {
  const Address = require('../models/Address').default;
  await Address.findOneAndDelete({ _id: req.params.addressId, user: req.user.id });

  const addresses = await Address.find({ user: req.user.id });
  res.status(200).json(new ApiResponse(true, 'Address deleted', addresses));
});

export const setDefaultAddress = asyncHandler(async (req: any, res: Response) => {
  const Address = require('../models/Address').default;

  await Address.updateMany({ user: req.user.id }, { isDefault: false });

  const address = await Address.findOneAndUpdate(
    { _id: req.params.addressId, user: req.user.id },
    { isDefault: true },
    { returnDocument: 'after' },
  );

  if (!address) throw new ApiError(404, 'Address not found');

  const addresses = await Address.find({ user: req.user.id });
  res.status(200).json(new ApiResponse(true, 'Default address updated', addresses));
});

// Wishlist Management
export const getWishlist = asyncHandler(async (req: any, res: Response) => {
  const userId = String(req.user.id);
  const cacheKey = sessionKeys.wishlist(userId);
  const cached = await getCachedSessionJson<unknown[]>(cacheKey);
  if (cached) {
    res.setHeader('X-Session-Cache', 'HIT');
    return res.status(200).json(new ApiResponse(true, 'Wishlist fetched', cached));
  }

  const user = await User.findById(req.user.id).select('wishlist');
  if (!user) throw new ApiError(404, 'User not found');

  const wishlistArray = user.wishlist || [];

  const [products, showcases] = await Promise.all([
    Product.find({ _id: { $in: wishlistArray } })
      .select(
        'name title price rentalPrice imageSrc images category isAvailable quantity availableQuantity slug',
      )
      .lean(),
    require('../models/ShowcaseCollection')
      .default.find({ _id: { $in: wishlistArray } })
      .select(
        'title subtitle category rentalPrice description image gallery inclusions colorPalette setupTimeHours popularityScore isActive',
      )
      .lean(),
  ]);

  const combinedWishlist = [
    ...products.map((p: any) => ({ ...p, itemType: 'product' })),
    ...showcases.map((s: any) => ({ ...s, itemType: 'event' })),
  ];

  await cacheWishlist(userId, combinedWishlist);
  res.setHeader('X-Session-Cache', 'MISS');
  res.status(200).json(new ApiResponse(true, 'Wishlist fetched', combinedWishlist));
});

export const toggleWishlist = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const index = user.wishlist.findIndex((id: any) => id.toString() === productId);
  if (index === -1) {
    if (user.wishlist.length >= 100) {
      throw new ApiError(400, 'Wishlist capacity reached. Maximum 100 items allowed.');
    }
    user.wishlist.push(productId);
  } else {
    user.wishlist.splice(index, 1);
  }

  await user.save();
  await invalidateUserSessionCaches(String(req.user.id));
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        index === -1 ? 'Added to wishlist' : 'Removed from wishlist',
        user.wishlist,
      ),
    );
});

// Compute and validate cart moved to UserService

export const getCart = asyncHandler(async (req: any, res: Response) => {
  const userId = String(req.user.id);
  const cacheKey = sessionKeys.cart(userId);
  const cached = await getCachedSessionJson<any>(cacheKey);
  if (cached) {
    res.setHeader('X-Session-Cache', 'HIT');
    return res.status(200).json(new ApiResponse(true, 'Cart fetched', cached));
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  const cartDetails = await UserService.computeAndValidateCart(user);
  await cacheCart(userId, cartDetails);
  res.setHeader('X-Session-Cache', 'MISS');
  res.status(200).json(new ApiResponse(true, 'Cart fetched', cartDetails));
});

export const addToCart = asyncHandler(async (req: any, res: Response) => {
  const { productId, quantity, type, rentalInfo } = req.body;
  const qty = Math.max(1, Math.min(50, Number(quantity) || 1));
  const product = await Product.findById(productId).select('stock isActive title');
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product is unavailable');
  }

  const itemType = type || 'purchase';

  // Find item by product and type. If rental, we might want to check dates too, but for simplicity:
  const userHasItem = await User.findOne({
    _id: req.user.id,
    'cart.product': productId,
    'cart.type': itemType,
  });

  let updatedUser;
  if (userHasItem) {
    // If it's a rental and they already have it, we just update the quantity and dates
    if (itemType === 'rental') {
      updatedUser = await User.findOneAndUpdate(
        { _id: req.user.id, 'cart.product': productId, 'cart.type': itemType },
        {
          $inc: { 'cart.$.quantity': qty },
          $set: { 'cart.$.rentalInfo': rentalInfo },
        },
        { returnDocument: 'after' },
      );
    } else {
      updatedUser = await User.findOneAndUpdate(
        { _id: req.user.id, 'cart.product': productId, 'cart.type': itemType },
        { $inc: { 'cart.$.quantity': qty } },
        { returnDocument: 'after' },
      );
    }
  } else if (qty > 0) {
    const currentUser = await User.findById(req.user.id).select('cart');
    if (currentUser && currentUser.cart.length >= 50) {
      throw new ApiError(400, 'Cart capacity reached. Maximum 50 items allowed.');
    }
    updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id },
      {
        $push: {
          cart: {
            product: productId,
            quantity: qty,
            variant: 'Default',
            type: itemType,
            rentalInfo,
          },
        },
      },
      { returnDocument: 'after' },
    );
  } else {
    updatedUser = await User.findById(req.user.id);
  }

  if (!updatedUser) throw new ApiError(404, 'User not found');

  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await UserService.computeAndValidateCart(updatedUser);
  res.status(200).json(new ApiResponse(true, 'Cart updated', cartDetails));
});

export const syncCart = asyncHandler(async (req: any, res: Response) => {
  const { cartItems } = req.body; // Expects array of { product: string, quantity: number }
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const updatedCart = (cartItems || [])
    .filter((item: any) => item.product || item._id || item.id)
    .map((item: any) => ({
      product: item.product || item._id || item.id,
      quantity: Math.max(1, Math.min(50, Number(item.quantity) || 1)),
      variant: item.variant || 'Default',
      type: item.type || 'purchase',
      rentalInfo: item.rentalInfo,
    }));

  if (updatedCart.length > 50) {
    throw new ApiError(400, 'Cart capacity reached. Maximum 50 items allowed.');
  }

  user.cart = updatedCart;

  // To avoid VersionError on concurrent syncs, use findOneAndUpdate just for the cart
  await User.findOneAndUpdate({ _id: req.user.id }, { $set: { cart: updatedCart } });

  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await UserService.computeAndValidateCart(user);
  res.status(200).json(new ApiResponse(true, 'Cart synced successfully', cartDetails));
});

export const removeFromCart = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.params;
  const user = await User.findOneAndUpdate(
    { _id: req.user.id },
    { $pull: { cart: { product: productId } } },
    { returnDocument: 'after' },
  );

  if (!user) throw new ApiError(404, 'User not found');

  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await UserService.computeAndValidateCart(user);
  res.status(200).json(new ApiResponse(true, 'Removed from cart', cartDetails));
});

// Recently Viewed Products tracking
export const getRecentlyViewed = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id).populate('recentlyViewed.product').lean();
  if (!user) throw new ApiError(404, 'User not found');

  const list = (user.recentlyViewed || []).filter((item: any) => item.product != null);
  res.status(200).json(new ApiResponse(true, 'Recently viewed list fetched', list));
});

export const trackRecentlyViewed = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (!user.recentlyViewed) user.recentlyViewed = [];

  user.recentlyViewed = user.recentlyViewed.filter(
    (item: any) => item.product.toString() !== productId,
  );

  user.recentlyViewed.unshift({ product: productId as any, viewedAt: new Date() });

  if (user.recentlyViewed.length > 20) {
    user.recentlyViewed = user.recentlyViewed.slice(0, 20);
  }

  await user.save();
  res.status(200).json(new ApiResponse(true, 'Product view tracked', user.recentlyViewed));
});

// Profile Preferences Management
export const updatePreferences = asyncHandler(async (req: any, res: Response) => {
  const { notificationPreferences, accountPreferences } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...notificationPreferences,
    };
  }
  if (accountPreferences) {
    user.accountPreferences = {
      ...user.accountPreferences,
      ...accountPreferences,
    };
  }

  await user.save();
  res.status(200).json(
    new ApiResponse(true, 'Preferences updated successfully', {
      notificationPreferences: user.notificationPreferences,
      accountPreferences: user.accountPreferences,
    }),
  );
});

// Upload and Persist Avatar
export const uploadAvatarController = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  // Clean up old avatar from Cloudinary if it exists
  if (user.avatar) {
    const publicId = extractPublicId(user.avatar);
    if (publicId) {
      deleteFromCloudinary(publicId).catch((err) =>
        logger.error(`Failed to clean up old avatar: ${err}`),
      );
    }
  }

  user.avatar = req.file.path || req.file.secure_url;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(true, 'Avatar uploaded successfully', { avatar: user.avatar }));
});

// Get all team members & invites
export const getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const [members, memberCount, invites, inviteCount] = await Promise.all([
    User.find({ role: { $in: STAFF_ROLES } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ role: { $in: STAFF_ROLES } }),
    TeamInvite.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    TeamInvite.countDocuments(),
  ]);

  setPaginationHeaders(res, memberCount + inviteCount, page, limit);
  res.status(200).json(
    new ApiResponse(true, 'Team data fetched', {
      members,
      invites,
      pagination: {
        memberCount,
        inviteCount,
        page,
        limit,
        totalCount: memberCount + inviteCount,
      },
    }),
  );
});

export const inviteTeamMember = asyncHandler(async (req: any, res: Response) => {
  const { email, role, permissions } = req.body;
  if (!email || !role) {
    throw new ApiError(400, 'Email and Role are required');
  }

  const invite = await UserService.inviteTeamMember(email, role, permissions, req.user.id);

  res.status(201).json(new ApiResponse(true, 'Invitation sent successfully', invite));
});

// Cancel team invitation
export const cancelTeamInvite = asyncHandler(async (req: Request, res: Response) => {
  const invite = await TeamInvite.findById(req.params.id);
  if (!invite) throw new ApiError(404, 'Invitation not found');

  if (invite.status !== 'pending') {
    throw new ApiError(400, 'Only pending invitations can be cancelled');
  }

  await TeamInvite.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(true, 'Invitation cancelled successfully'));
});

// Public: Get invite details by token
export const getInviteDetailsByToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Invite token is required');

  const invite = await TeamInvite.findOne({ token: String(token) });
  if (!invite) throw new ApiError(404, 'Invalid or expired invitation token');

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new ApiError(400, 'This invitation link has expired.');
  }

  res.status(200).json(new ApiResponse(true, 'Invitation details loaded', invite));
});

// Public: Respond to invite
export const respondToInvite = asyncHandler(async (req: any, res: Response) => {
  const { token, status } = req.body; // 'accepted' or 'declined'
  if (!token || !['accepted', 'declined'].includes(status)) {
    throw new ApiError(400, 'Valid token and response status are required');
  }

  const invite = await TeamInvite.findOne({ token: String(token), status: 'pending' });
  if (!invite) throw new ApiError(404, 'Invalid, expired, or already-processed invitation');

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new ApiError(400, 'This invitation link has expired and cannot be accepted.');
  }

  invite.status = status;
  await invite.save();

  if (status === 'accepted') {
    // Check if user exists with this email address
    const cleanEmail = canonicalizeEmail(invite.email);
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      await User.create({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: invite.role,
        isVerified: true,
      });
    } else {
      user.role = invite.role;
      await user.save();
    }
  }

  res.status(200).json(new ApiResponse(true, `Invitation ${status} successfully`, { status }));
});
