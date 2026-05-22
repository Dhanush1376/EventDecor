import { Request, Response } from 'express';
import User from '../models/User';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import Product from '../models/Product';
import TeamInvite from '../models/TeamInvite';
import { sendEmail } from '../utils/sendEmail';
import crypto from 'crypto';
import { canonicalizeEmail } from '../utils/emailHelper';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';
import logger from '../config/logger';
import { setPaginationHeaders } from '../utils/paginationHeaders';
import {
  cacheCart,
  cacheWishlist,
  getCachedSessionJson,
  invalidateUserSessionCaches,
  sessionKeys,
} from '../utils/userSessionCache';

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
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(true, 'Users fetched', formatPaginationResponse(users, totalCount, page, limit)));
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const user = await User.findById(req.params.id).populate({
    path: 'orders',
    select: 'totalAmount status createdAt paymentStatus paymentMethod deliveryStatus razorpayOrderId',
    options: {
      sort: { createdAt: -1 },
      limit: Number(limit),
      skip: skip,
    }
  });

  if (!user) throw new ApiError(404, 'User not found');

  // We fetch total order count directly from the Order model if needed for full pagination,
  // but to maintain API compatibility we return the user document.
  res.status(200).json(new ApiResponse(true, 'User fetched', user));
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!['user', 'admin', 'manager', 'coordinator'].includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  if (role === 'admin' && (req as any).user!.role !== 'super_admin') {
    throw new ApiError(403, 'Only super admins can assign the admin role.');
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.status(200).json(new ApiResponse(true, 'User role updated', user));
});

export const getProductCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await Product.distinct('category', { isActive: true });
  res.status(200).json(new ApiResponse(true, 'Categories fetched', ['All', ...categories.sort()]));
});

// Profile Management
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id).select('-password');
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
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.status(200).json(new ApiResponse(true, 'Addresses fetched', user.addresses));
});

export const addAddress = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const newAddress = { ...req.body, isDefault: user.addresses.length === 0 };
  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json(new ApiResponse(true, 'Address added', user.addresses));
});

export const updateAddress = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const addressIndex = user.addresses.findIndex((addr: any) => addr._id.toString() === req.params.addressId);
  if (addressIndex === -1) throw new ApiError(404, 'Address not found');

  user.addresses[addressIndex] = { ...user.addresses[addressIndex], ...req.body };
  await user.save();

  res.status(200).json(new ApiResponse(true, 'Address updated', user.addresses));
});

export const deleteAddress = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.addresses = user.addresses.filter((addr: any) => addr._id.toString() !== req.params.addressId);
  await user.save();

  res.status(200).json(new ApiResponse(true, 'Address deleted', user.addresses));
});

export const setDefaultAddress = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.addresses = user.addresses.map((addr: any) => {
    addr.isDefault = addr._id.toString() === req.params.addressId;
    return addr;
  });

  await user.save();
  res.status(200).json(new ApiResponse(true, 'Default address updated', user.addresses));
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
  
  // Bug-11 Fix: Single optimized query instead of N+1
  const products = await Product.find({ _id: { $in: user.wishlist } })
    .select('title price images rating slug category isActive')
    .lean();

  await cacheWishlist(userId, products);
  res.setHeader('X-Session-Cache', 'MISS');
  res.status(200).json(new ApiResponse(true, 'Wishlist fetched', products));
});

export const toggleWishlist = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const index = user.wishlist.indexOf(productId);
  if (index === -1) {
    user.wishlist.push(productId);
  } else {
    user.wishlist.splice(index, 1);
  }

  await user.save();
  await invalidateUserSessionCaches(String(req.user.id));
  res.status(200).json(new ApiResponse(true, index === -1 ? 'Added to wishlist' : 'Removed from wishlist', user.wishlist));
});

// Database-driven Cart Management
const computeAndValidateCart = async (user: any) => {
  let subtotal = 0;
  const validatedCart = [];
  let cartChanged = false;

  for (const item of user.cart) {
    if (!item.product) continue;
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      cartChanged = true;
      continue; // Auto-prune inactive or deleted products
    }

    let quantity = item.quantity;
    if (quantity > product.stock) {
      quantity = product.stock;
      cartChanged = true;
    }

    if (quantity > 0) {
      subtotal += product.price * quantity;
      validatedCart.push({
        product: product,
        quantity,
        variant: item.variant || 'Default'
      });
    } else {
      cartChanged = true;
    }
  }

  if (cartChanged) {
    user.cart = validatedCart.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      variant: item.variant
    }));
    await user.save();
  }

  const shippingFee = subtotal > 2000 || subtotal === 0 ? 0 : 100;
  const platformFee = 0;
  const discount = 0;
  const total = subtotal + shippingFee - discount;

  return {
    items: validatedCart,
    summary: {
      subtotal,
      shippingFee,
      platformFee,
      discount,
      total
    }
  };
};

export const getCart = asyncHandler(async (req: any, res: Response) => {
  const userId = String(req.user.id);
  const cacheKey = sessionKeys.cart(userId);
  const cached = await getCachedSessionJson<{ items: unknown[]; summary: Record<string, number> }>(cacheKey);
  if (cached) {
    res.setHeader('X-Session-Cache', 'HIT');
    return res.status(200).json(new ApiResponse(true, 'Cart fetched', cached));
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  const cartDetails = await computeAndValidateCart(user);
  await cacheCart(userId, cartDetails);
  res.setHeader('X-Session-Cache', 'MISS');
  res.status(200).json(new ApiResponse(true, 'Cart fetched', cartDetails));
});

export const addToCart = asyncHandler(async (req: any, res: Response) => {
  const { productId, quantity } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const cartItemIndex = user.cart.findIndex(
    (item: any) => item.product && item.product.toString() === productId
  );

  if (cartItemIndex > -1) {
    if (quantity <= 0) {
      user.cart.splice(cartItemIndex, 1);
    } else {
      user.cart[cartItemIndex].quantity = quantity;
    }
  } else if (quantity > 0) {
    user.cart.push({ product: productId as any, quantity, variant: 'Default' });
  }

  await user.save();
  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await computeAndValidateCart(user);
  res.status(200).json(new ApiResponse(true, 'Cart updated', cartDetails));
});

export const syncCart = asyncHandler(async (req: any, res: Response) => {
  const { cartItems } = req.body; // Expects array of { product: string, quantity: number }
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.cart = (cartItems || [])
    .filter((item: any) => (item.product || item._id || item.id))
    .map((item: any) => ({
      product: item.product || item._id || item.id,
      quantity: item.quantity,
      variant: item.variant || 'Default'
    }));

  await user.save();
  await invalidateUserSessionCaches(String(req.user.id));
  const cartDetails = await computeAndValidateCart(user);
  res.status(200).json(new ApiResponse(true, 'Cart synced successfully', cartDetails));
});

export const removeFromCart = asyncHandler(async (req: any, res: Response) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.cart = user.cart.filter((item: any) => item.product && item.product.toString() !== productId);
  await user.save();
  await invalidateUserSessionCaches(String(req.user.id));

  const cartDetails = await computeAndValidateCart(user);
  res.status(200).json(new ApiResponse(true, 'Removed from cart', cartDetails));
});

// Recently Viewed Products tracking
export const getRecentlyViewed = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id).populate('recentlyViewed.product');
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
    (item: any) => item.product.toString() !== productId
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
      ...notificationPreferences 
    };
  }
  if (accountPreferences) {
    user.accountPreferences = { 
      ...user.accountPreferences, 
      ...accountPreferences 
    };
  }

  await user.save();
  res.status(200).json(new ApiResponse(true, 'Preferences updated successfully', {
    notificationPreferences: user.notificationPreferences,
    accountPreferences: user.accountPreferences
  }));
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
      deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up old avatar: ${err}`));
    }
  }

  user.avatar = req.file.path || req.file.secure_url;
  await user.save();

  res.status(200).json(new ApiResponse(true, 'Avatar uploaded successfully', { avatar: user.avatar }));
});

// Get all team members & invites
export const getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const [members, memberCount, invites, inviteCount] = await Promise.all([
    User.find({ role: { $in: ['admin', 'manager', 'coordinator'] as const } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments({ role: { $in: ['admin', 'manager', 'coordinator'] as const } }),
    TeamInvite.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
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
    })
  );
});

// Create team invitation
export const inviteTeamMember = asyncHandler(async (req: any, res: Response) => {
  const { email, role, permissions } = req.body;
  if (!email || !role) {
    throw new ApiError(400, 'Email and Role are required');
  }

  const cleanEmail = canonicalizeEmail(email);

  // Check if user is already a team member
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser && ['admin', 'manager', 'coordinator'].includes(existingUser.role)) {
    throw new ApiError(400, 'This user is already a registered team member');
  }

  // Cancel any existing pending invite for this email
  await TeamInvite.deleteMany({ email: cleanEmail, status: 'pending' });

  const token = crypto.randomBytes(32).toString('hex');
  const invite = await TeamInvite.create({
    email: cleanEmail,
    role,
    permissions: permissions || 'Full Access',
    token,
    invitedBy: req.user.id
  });

  // Dynamic notification to member email!
  const frontendUrl = (process.env.FRONTEND_URLS?.split(',')[0] || process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  const acceptUrl = `${frontendUrl}/accept-invite?token=${token}`;
  
  const { getTeamInviteEmailTemplate } = require('../utils/emailTemplates');
  const emailHtml = getTeamInviteEmailTemplate(acceptUrl, role, permissions || 'Full Access');

  await sendEmail({
    email: cleanEmail,
    subject: 'Invitation to join Siri Arts & Crafts Admin Team',
    message: `You are invited to join the Siri Arts & Crafts team as an ${role}. Visit here to accept: ${acceptUrl}`,
    html: emailHtml
  });

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
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: invite.role,
        isVerified: true
      });
    } else {
      user.role = invite.role;
      await user.save();
    }
  }

  res.status(200).json(new ApiResponse(true, `Invitation ${status} successfully`, { status }));
});
