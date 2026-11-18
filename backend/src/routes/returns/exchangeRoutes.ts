import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import * as exchangeController from '../../controllers/returns/exchangeController';

const router = express.Router();

// Read-only history of exchanges from the previous automated flow.
router.get('/my-exchanges', requireAuth, exchangeController.getMyExchanges);

export default router;
