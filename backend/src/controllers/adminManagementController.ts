import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { canonicalizeEmail } from '../utils/emailHelper';
import { isProtectedSuperAdminEmail } from '../config/adminConfig';

/**
 * Get all administrators (Staff)
 * Protected by requireSuperAdmin
 */
export const getAdmins = asyncHandler(async (req: Request, res: Response) => {
  const admins = await User.find({
    role: { $in: ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'] }
  }).select('-passwordHash -twoFactorSecret').sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(true, 'Admins retrieved successfully', admins));
});

/**
 * Add a new administrator
 * Protected by requireSuperAdmin
 */
export const addAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, role, password } = req.body;
  
  if (!name || !email || !role || !password) {
    throw new ApiError(400, 'Name, email, role, and temporary password are required');
  }

  const cleanEmail = canonicalizeEmail(email);

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    if (['user', 'customer'].includes(existingUser.role)) {
      // Upgrade existing customer to admin
      const salt = await bcrypt.genSalt(10);
      existingUser.passwordHash = await bcrypt.hash(password, salt);
      existingUser.role = role;
      existingUser.passwordChangedAt = new Date();
      await existingUser.save();
      
      return res.status(200).json(new ApiResponse(true, 'Existing user upgraded to admin', existingUser));
    }
    throw new ApiError(400, 'User with this email already exists and is an admin');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newAdmin = await User.create({
    name,
    email: cleanEmail,
    role,
    passwordHash,
    isVerified: true,
    passwordChangedAt: new Date()
  });

  res.status(201).json(new ApiResponse(true, 'Admin created successfully', newAdmin));
});

/**
 * Update administrator role
 * Protected by requireSuperAdmin
 */
export const updateAdminRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    throw new ApiError(400, 'Role is required');
  }

  const admin = await User.findById(id);
  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  if (isProtectedSuperAdminEmail(admin.email)) {
    throw new ApiError(403, 'The primary Super Admin role cannot be changed');
  }

  admin.role = role;
  await admin.save();

  res.status(200).json(new ApiResponse(true, 'Admin role updated successfully', admin));
});

/**
 * Remove/Disable administrator
 * Protected by requireSuperAdmin
 */
export const removeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const admin = await User.findById(id);
  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  if (isProtectedSuperAdminEmail(admin.email)) {
    throw new ApiError(403, 'The primary Super Admin cannot be removed');
  }

  // Downgrade to customer and remove password hash
  admin.role = 'customer';
  admin.passwordHash = undefined;
  await admin.save();

  res.status(200).json(new ApiResponse(true, 'Admin privileges revoked successfully', null));
});
