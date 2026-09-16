import { Router } from 'express';
import {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/public', getActiveBanners);

// Admin routes (protégées par rôle ADMIN uniquement)
router.get('/', authenticateToken, requireRole(['ADMIN']), getAllBanners);
router.get('/:id', authenticateToken, requireRole(['ADMIN']), getBannerById);
router.post('/', authenticateToken, requireRole(['ADMIN']), createBanner);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateBanner);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteBanner);

export default router;
