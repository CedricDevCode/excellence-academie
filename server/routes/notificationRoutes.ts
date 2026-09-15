import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, sendBulkNotification, streamNotifications } from '../controllers/notificationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken); // Toutes les routes requièrent une authentification

router.get('/stream', streamNotifications);
router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
// Envoi groupé restreint aux ADMIN uniquement
router.post('/bulk', requireRole(['ADMIN']), sendBulkNotification);

export default router;
