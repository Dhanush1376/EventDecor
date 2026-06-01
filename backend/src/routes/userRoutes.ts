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
} from '../controllers/userController';
import { exportMyData, eraseMyAccount } from '../controllers/privacyController';
import { requireAuth, requireSuperAdmin, requireRole } from '../middleware/authMiddleware';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

// Public utility
router.get('/categories', getProductCategories);

// Authenticated User Routes
router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);

router.get('/addresses', requireAuth, getAddresses);
router.post('/addresses', requireAuth, addAddress);
router.patch('/addresses/:addressId', requireAuth, updateAddress);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);
router.patch('/addresses/:addressId/default', requireAuth, setDefaultAddress);

router.get('/wishlist', requireAuth, getWishlist);
router.post('/wishlist/toggle', requireAuth, toggleWishlist);

router.get('/cart', requireAuth, getCart);
router.post('/cart', requireAuth, addToCart);
router.put('/cart', requireAuth, syncCart);
router.delete('/cart/:productId', requireAuth, removeFromCart);

router.get('/recently-viewed', requireAuth, getRecentlyViewed);
router.post('/recently-viewed', requireAuth, trackRecentlyViewed);

router.patch('/preferences', requireAuth, updatePreferences);
router.post('/avatar', requireAuth, ...uploadAvatar.single('avatar'), uploadAvatarController);

router.get('/me/export', requireAuth, exportMyData);
router.delete('/me', requireAuth, eraseMyAccount);

// Admin Routes & Team Management
router.get('/', requireAuth, requireRole(['super_admin', 'main_admin']), getUsers);
router.get('/team', requireAuth, requireRole(['super_admin', 'main_admin']), getTeamMembers);
router.post('/team/invite', requireAuth, requireSuperAdmin, inviteTeamMember);
router.delete('/team/invite/:id', requireAuth, requireSuperAdmin, cancelTeamInvite);
router.get('/team/invite/details', getInviteDetailsByToken); // Public token check
router.post('/team/invite/respond', respondToInvite); // Public accept/decline

router.get('/:id', requireAuth, requireRole(['super_admin', 'main_admin']), getUserById);
router.patch('/:id/role', requireAuth, requireSuperAdmin, updateUserRole);

export default router;
