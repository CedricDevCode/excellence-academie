import { Router } from 'express';
import { getMySubscriptions, getSubscriptionsByUser, getOverdueItems, paySubscription, initCashPayment, confirmCashPayment, resendCashPaymentOtp, initRegistrationCompletion, confirmRegistrationCompletion, resendRegistrationCompletionOtp } from '../controllers/subscriptionController';
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
router.post('/complete-registration/init', requireRole(['ADMIN']), initRegistrationCompletion);
router.post('/complete-registration/resend', requireRole(['ADMIN']), resendRegistrationCompletionOtp);
router.post('/complete-registration/confirm', requireRole(['ADMIN']), confirmRegistrationCompletion);

export default router;
