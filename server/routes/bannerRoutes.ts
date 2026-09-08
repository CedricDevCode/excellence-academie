import { Router } from 'express';
import {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/public', getActiveBanners);

// Admin routes
router.get('/', authMiddleware, getAllBanners);
router.get('/:id', authMiddleware, getBannerById);
router.post('/', authMiddleware, createBanner);
router.put('/:id', authMiddleware, updateBanner);
router.delete('/:id', authMiddleware, deleteBanner);

export default router;
