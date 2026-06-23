import { Router } from 'express';
import {
  getLocations,
  getLocationBySlug,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/locationController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.route('/').get(getLocations).post(requireAdmin, createLocation);

router.route('/:id').put(requireAdmin, updateLocation).delete(requireAdmin, deleteLocation);

router.route('/slug/:slug').get(getLocationBySlug);

export default router;
