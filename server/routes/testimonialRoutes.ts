import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getTestimonials, createTestimonial, getAllTestimonials, updateTestimonial, deleteTestimonial, uploadTestimonialImage } from '../controllers/testimonialController';
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

// Public routes
router.get('/', getTestimonials);
router.post('/', createTestimonial);
router.post('/upload', upload.array('images', 3), uploadTestimonialImage);

// Admin routes
router.get('/admin/all', authenticateToken, requireRole(['ADMIN']), getAllTestimonials);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateTestimonial);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteTestimonial);

export default router;
