import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getTestimonials, createTestimonial, createTestimonialAdmin, getAllTestimonials, updateTestimonial, deleteTestimonial, uploadTestimonialImage } from '../controllers/testimonialController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, '..', 'uploads', 'testimonials');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

// Rate limiting pour les uploads (10/heure)
const testimonialUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'uploads. Réessayez dans une heure.' },
});

// Public routes
router.get('/', getTestimonials);
router.post('/', createTestimonial);
router.post('/upload', authenticateToken, testimonialUploadLimiter, upload.array('images', 3), uploadTestimonialImage);

// Admin routes
router.get('/admin/all', authenticateToken, requireRole(['ADMIN']), getAllTestimonials);
router.post('/admin', authenticateToken, requireRole(['ADMIN']), createTestimonialAdmin);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateTestimonial);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteTestimonial);

export default router;
