import express from 'express';
import { resolveContact, updateContact } from '../../controllers/customer/contactController';
import { requireAuth as protect } from '../../middleware/authMiddleware';

const router = express.Router();

router.use(protect); // Ensure all contact routes are authenticated

router.get('/resolve', resolveContact);
router.post('/update', updateContact);

export default router;
