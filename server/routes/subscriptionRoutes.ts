import { Router } from 'express';
import { getMySubscriptions, getOverdueItems, paySubscription } from '../controllers/subscriptionController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/my-subscriptions', getMySubscriptions);
router.get('/overdue', requireRole(['ADMIN', 'ACCOUNTANT', 'STUDENT']), getOverdueItems);
router.post('/pay', requireRole(['STUDENT']), paySubscription);

export default router;
