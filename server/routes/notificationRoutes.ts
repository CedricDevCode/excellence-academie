import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, sendBulkNotification, streamNotifications } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken); // All routes require authentication

router.get('/stream', streamNotifications);
router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.post('/bulk', sendBulkNotification);

export default router;
