import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUserRole,
  getProductCategories,
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  toggleWishlist,
  getCart,
  addToCart,
  syncCart,
  removeFromCart,
  getRecentlyViewed,
  trackRecentlyViewed,
  updatePreferences,
  uploadAvatarController,
  getTeamMembers,
  inviteTeamMember,
  cancelTeamInvite,
  getInviteDetailsByToken,
  respondToInvite,
} from '../../controllers/users/userController';
import { exportMyData, eraseMyAccount } from '../../controllers/customer/privacyController';
import {
  requireAuth,
  requireAdmin,
} from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import {
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
  toggleWishlistSchema,
  addToCartSchema,
  syncCartSchema,
  trackRecentlyViewedSchema,
} from '../../validators/userSchema';
import { uploadAvatar } from '../../middleware/upload';

const router = Router();

// Public utility
router.get('/categories', getProductCategories);

// Authenticated User Routes
router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, validateRequest(updateProfileSchema), updateProfile);

router.get('/addresses', requireAuth, getAddresses);
router.post('/addresses', requireAuth, validateRequest(addressSchema), addAddress);
router.patch(
  '/addresses/:addressId',
  requireAuth,
  validateRequest(updateAddressSchema),
  updateAddress,
);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);
router.patch('/addresses/:addressId/default', requireAuth, setDefaultAddress);

router.get('/wishlist', requireAuth, getWishlist);
router.post('/wishlist/toggle', requireAuth, validateRequest(toggleWishlistSchema), toggleWishlist);

router.get('/cart', requireAuth, getCart);
router.post('/cart', requireAuth, validateRequest(addToCartSchema), addToCart);
router.put('/cart', requireAuth, validateRequest(syncCartSchema), syncCart);
router.delete('/cart/:productId', requireAuth, removeFromCart);

router.get('/recently-viewed', requireAuth, getRecentlyViewed);
router.post(
  '/recently-viewed',
  requireAuth,
  validateRequest(trackRecentlyViewedSchema),
  trackRecentlyViewed,
);

router.patch('/preferences', requireAuth, updatePreferences);
router.post('/avatar', requireAuth, ...uploadAvatar.single('avatar'), uploadAvatarController);

router.get('/me/export', requireAuth, exportMyData);
router.delete('/me', requireAuth, eraseMyAccount);

// Admin Routes & Team Management
router.get('/', requireAuth, requireAdmin, getUsers);
router.get('/team', requireAuth, requireAdmin, getTeamMembers);
router.post('/team/invite', requireAuth, requireAdmin, inviteTeamMember);
router.delete('/team/invite/:id', requireAuth, requireAdmin, cancelTeamInvite);
router.get('/team/invite/details', getInviteDetailsByToken); // Public token check
router.post('/team/invite/respond', respondToInvite); // Public accept/decline

router.get('/:id', requireAuth, requireAdmin, getUserById);
router.patch('/:id/role', requireAuth, requireAdmin, updateUserRole);

export default router;
