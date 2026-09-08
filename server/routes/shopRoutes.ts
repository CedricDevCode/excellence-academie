import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getProducts, getProductById, getAllProducts, createProduct, updateProduct, deleteProduct, getOrders, createOrder, updateOrderStatus, getStudentOrders, uploadProductImage, getProductReviews, createReview } from '../controllers/shopController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
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
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/orders', createOrder);

// Reviews
router.get('/products/:id/reviews', getProductReviews);
router.post('/products/:id/reviews', authenticateToken, createReview);

// Student routes
router.get('/my-orders', authenticateToken, getStudentOrders);

// Admin/Secretary routes for Products
router.get('/admin/products', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), getAllProducts);
router.post('/admin/products/upload', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), upload.single('image'), uploadProductImage);
router.post('/admin/products', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), createProduct);
router.put('/admin/products/:id', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), updateProduct);
router.delete('/admin/products/:id', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), deleteProduct);

// Admin/Secretary routes for Orders
router.get('/admin/orders', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), getOrders);
router.put('/admin/orders/:id/status', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), updateOrderStatus);

export default router;
