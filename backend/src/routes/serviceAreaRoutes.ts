import { Router } from 'express';
import {
  getServiceAreas,
  createServiceArea,
  updateServiceArea,
  deleteServiceArea,
  checkServiceArea,
} from '../controllers/serviceAreaController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { serviceAreaValidator, checkServiceAreaValidator } from '../validators/rentalValidator';

const router = Router();

// Public — check if address is in service area
router.post('/check', checkServiceAreaValidator, validate, checkServiceArea);

// Admin CRUD
router.get('/', requireAuth, requireAdmin, getServiceAreas);
router.post('/', requireAuth, requireAdmin, serviceAreaValidator, validate, createServiceArea);
router.put('/:id', requireAuth, requireAdmin, serviceAreaValidator, validate, updateServiceArea);
router.delete('/:id', requireAuth, requireAdmin, deleteServiceArea);

export default router;
