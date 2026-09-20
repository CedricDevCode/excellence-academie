import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

const bannerUploadDir = path.resolve(process.cwd(), 'uploads', 'banners');
fs.mkdirSync(bannerUploadDir, { recursive: true });

const bannerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, bannerUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `banner-${unique}${ext}`);
  }
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(null, ok);
  }
});

// Public routes
router.get('/public', getActiveBanners);

// Upload image bannière
router.post('/upload', authenticateToken, requireRole(['ADMIN']), bannerUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  const url = `/uploads/banners/${req.file.filename}`;
  res.json({ url });
});

// Admin routes (protégées par rôle ADMIN uniquement)
router.get('/', authenticateToken, requireRole(['ADMIN']), getAllBanners);
router.get('/:id', authenticateToken, requireRole(['ADMIN']), getBannerById);
router.post('/', authenticateToken, requireRole(['ADMIN']), createBanner);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateBanner);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteBanner);

export default router;
