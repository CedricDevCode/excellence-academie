import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { getProducts, getProductById, getAllProducts, createProduct, updateProduct, deleteProduct, getOrders, createOrder, updateOrderStatus, getStudentOrders, uploadProductImage, getProductReviews, createReview } from '../controllers/shopController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

// Les images sont stockées en base (table ProductImage) : multer garde le fichier
// en mémoire, plus rien n'est écrit sur disque (les uploads disque étaient perdus
// à chaque redéploiement Hostinger).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err: any = new Error('Format invalide. Seules les images (JPEG, PNG, WebP, GIF) sont autorisées.');
      err.status = 400;
      cb(err);
    }
  },
});

const router = Router();

// Rate limiting spécifique pour les uploads (100/heure — un catalogue complet
// de produits ne doit jamais être bloqué par la limite)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'uploads. Réessayez dans une heure.' },
});

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
router.post('/admin/products/upload', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), uploadLimiter, upload.single('image'), uploadProductImage);
router.post('/admin/products', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), createProduct);
router.put('/admin/products/:id', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), updateProduct);
router.delete('/admin/products/:id', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), deleteProduct);

// Admin/Secretary routes for Orders
router.get('/admin/orders', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), getOrders);
router.put('/admin/orders/:id/status', authenticateToken, requireRole(['ADMIN', 'SECRETARY']), updateOrderStatus);

export default router;
