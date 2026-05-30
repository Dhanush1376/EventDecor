import express from 'express';
import { getHomepageData } from '../controllers/homepageController';

const router = express.Router();

router.get('/', getHomepageData);

export default router;
