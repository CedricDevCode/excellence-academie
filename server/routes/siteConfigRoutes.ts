import { Router } from 'express';
import { getPublicConfig, getConfig, updateConfig } from '../controllers/siteConfigController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public
router.get('/public', getPublicConfig);

// Admin (ADMIN uniquement)
router.get('/', authenticateToken, requireRole(['ADMIN']), getConfig);
router.put('/', authenticateToken, requireRole(['ADMIN']), updateConfig);

export default router;