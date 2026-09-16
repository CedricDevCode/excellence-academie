import { Router } from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Route publique : lecture des catégories (utile pour catalogue, formulaires, etc.)
router.get('/', getAllCategories);

// Routes d'administration protégées (ADMIN uniquement)
router.use(authenticateToken);
router.post('/', requireRole(['ADMIN']), createCategory);
router.put('/:id', requireRole(['ADMIN']), updateCategory);
router.delete('/:id', requireRole(['ADMIN']), deleteCategory);

export default router;
