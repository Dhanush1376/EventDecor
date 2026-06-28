import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import storeSettingsService from '../../services/StoreSettingsService';
import logger from '../../config/logger';

const router = Router();

/**
 * @route   GET /api/v1/settings/public
 * @desc    Get public store settings (cached, safe for storefront)
 * @access  Public
 */
router.get('/public', async (req, res, next) => {
  try {
    const settings = await storeSettingsService.getPublicSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error fetching public store settings:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/settings/admin
 * @desc    Get full store settings including audit logs
 * @access  Private/Admin
 */
router.get(
  '/admin',
  requireAuth,
  requireRole(['admin', 'super_admin', 'owner']),
  async (req, res, next) => {
    try {
      const bypassCache = req.query.fresh === 'true';
      const settings = await storeSettingsService.getSettings(bypassCache);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Error fetching admin store settings:', error);
      next(error);
    }
  },
);

/**
 * @route   PATCH /api/v1/settings/:section
 * @desc    Update a specific section of store settings
 * @access  Private/SuperAdmin
 */
router.patch(
  '/:section',
  requireAuth,
  requireRole(['super_admin', 'owner']),
  async (req, res, next) => {
    try {
      const { section } = req.params;
      const data = req.body;

      // Whitelist allowed sections
      const allowedSections = [
        'general',
        'shipping',
        'payments',
        'returnsExchanges',
        'cancellation',
        'taxes',
        'loyalty',
        'orders',
        'contact',
        'legal',
        'notifications',
        'storefront',
      ];

      if (!allowedSections.includes(section as string)) {
        return res.status(400).json({
          success: false,
          message: `Invalid settings section: ${section}`,
        });
      }

      const updatedSettings = await storeSettingsService.updateSection(
        section as any,
        data,
        req.user!.id,
      );

      res.json({
        success: true,
        message: `${section} settings updated successfully`,
        data: updatedSettings,
      });
    } catch (error) {
      logger.error(`Error updating store settings section ${req.params.section}:`, error);
      next(error);
    }
  },
);

export default router;
