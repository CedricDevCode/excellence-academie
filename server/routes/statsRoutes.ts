import { Router } from 'express';
import { getDashboardStats, getCityBreakdown } from '../controllers/statsController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getDashboardStats);
router.get('/city-breakdown', requireRole(['ADMIN', 'ACCOUNTANT']), getCityBreakdown);

export default router;
