import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import {
  getBlogPosts, getBlogPostBySlug, createBlogPost, updateBlogPost, deleteBlogPost,
  uploadPostAttachment,
  getComments, createComment, deleteComment,
  createExercise, updateExercise, deleteExercise, uploadExerciseAttachment,
  submitExercise, getSubmissions, evaluateSubmission,
  incrementBlogView, rateBlogPost, subscribeBlog, uploadBlogCover,
  getPublicPosts, getPublicPostBySlug, getPublicPostsRss,
} from '../controllers/blogController';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogUploadsDir = path.join(__dirname, '..', 'uploads', 'blog');
fs.mkdirSync(blogUploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, blogUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les images et PDF sont autorisés'));
    }
  },
});

import rateLimit from 'express-rate-limit';

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez plus tard.' },
});

const router = Router();

// ─── Abonnement aux alertes concours (public, rate-limité) ──────────
router.post('/subscribe', subscribeLimiter, subscribeBlog);

// ─── Journal public (SEO, indexable, sans authentification) ───────────
router.get('/public', getPublicPosts);
router.get('/public/rss.xml', getPublicPostsRss);
router.get('/public/:slug', getPublicPostBySlug);

// ─── Accès restreint ─────────────────────────────────────────
// Le blog est réservé aux membres actifs : étudiants inscrits
// (compte actif) et équipe (ADMIN / TEACHER / SECRETARY).
router.use(authenticateToken);

router.get('/', getBlogPosts);
router.get('/:slug', getBlogPostBySlug);

// ─── Protected routes ────────────────────────────────────────

// Posts
router.post('/', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), createBlogPost);
router.put('/:id', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), updateBlogPost);
router.delete('/:id', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), deleteBlogPost);
router.post('/cover', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), memoryUpload.single('file'), uploadBlogCover);
router.post('/:slug/view', incrementBlogView);
router.post('/:id/rate', rateBlogPost);
router.post('/:id/attachments', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), upload.single('file'), uploadPostAttachment);

router.get('/:postId/comments', getComments);
router.post('/:postId/comments', requireRole(['ADMIN', 'TEACHER', 'SECRETARY', 'STUDENT']), createComment);
router.delete('/comments/:id', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), deleteComment);

// Exercises
router.post('/:postId/exercises', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), createExercise);
router.put('/exercises/:id', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), updateExercise);
router.delete('/exercises/:id', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), deleteExercise);
router.post('/exercises/:id/attachments', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), upload.single('file'), uploadExerciseAttachment);

// Submissions
router.post('/exercises/:id/submit', requireRole(['STUDENT']), upload.single('file'), submitExercise);
router.get('/exercises/:id/submissions', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), getSubmissions);
router.put('/submissions/:id/evaluate', requireRole(['ADMIN', 'TEACHER', 'SECRETARY']), evaluateSubmission);

export default router;
