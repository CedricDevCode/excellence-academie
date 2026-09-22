import path from 'path';
import { Router } from 'express';
import multer from 'multer';
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

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(null, ok);
  }
});

// Public routes
router.get('/public', getActiveBanners);

// Upload image bannière → retourne base64 data URL
router.post('/upload', authenticateToken, requireRole(['ADMIN']), bannerUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  res.json({ url: base64 });
});

// Admin routes (protégées par rôle ADMIN uniquement)
router.get('/', authenticateToken, requireRole(['ADMIN']), getAllBanners);
router.get('/:id', authenticateToken, requireRole(['ADMIN']), getBannerById);
router.post('/', authenticateToken, requireRole(['ADMIN']), createBanner);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateBanner);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteBanner);

export default router;
