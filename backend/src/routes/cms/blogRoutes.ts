import { Router } from 'express';
import {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../../controllers/cms/blogController';
import { requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

router.route('/').get(getBlogs).post(requireAdmin, createBlog);

router.route('/:id').put(requireAdmin, updateBlog).delete(requireAdmin, deleteBlog);

router.route('/slug/:slug').get(getBlogBySlug);

export default router;
