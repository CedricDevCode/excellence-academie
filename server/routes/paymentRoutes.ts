import { Router } from 'express';
import { getPayments, getMyPayments, initializePayment, verifyPayment } from '../controllers/paymentController';
import { initPayment, checkPaymentStatus, handleWebhook } from '../controllers/geniusPayController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/webhook', handleWebhook);
router.get('/geniuspay/status/:reference', checkPaymentStatus);

router.use(authenticateToken);

router.get('/my-payments', getMyPayments);
router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getPayments);
router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);
router.post('/geniuspay/init', initPayment);

export default router;
