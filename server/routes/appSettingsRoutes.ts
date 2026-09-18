import { Router } from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/appSettingsController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public read (utilisé côté front pour connaître les tarifs)
router.get('/', getAppSettings);

// Update réservé aux admins
router.use(authenticateToken);
router.put('/', requireRole(['ADMIN']), updateAppSettings);

export default router;
