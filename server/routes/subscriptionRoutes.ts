import { Router } from 'express';
import { getMySubscriptions, getSubscriptionsByUser, getOverdueItems, paySubscription, initCashPayment, confirmCashPayment, resendCashPaymentOtp } from '../controllers/subscriptionController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/by-user', requireRole(['ADMIN', 'ACCOUNTANT']), getSubscriptionsByUser);
router.get('/my-subscriptions', getMySubscriptions);
router.get('/overdue', requireRole(['ADMIN', 'ACCOUNTANT', 'STUDENT']), getOverdueItems);
router.post('/pay', requireRole(['STUDENT']), paySubscription);
router.post('/cash/init', requireRole(['ADMIN']), initCashPayment);
router.post('/cash/resend', requireRole(['ADMIN']), resendCashPaymentOtp);
router.post('/cash/confirm', requireRole(['ADMIN']), confirmCashPayment);

export default router;
