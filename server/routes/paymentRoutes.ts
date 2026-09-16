import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPayments, getMyPayments, initializePayment, verifyPayment } from '../controllers/paymentController';
import { initPayment, checkPaymentStatus, handleWebhook } from '../controllers/geniusPayController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Rate limiting spécifique pour le webhook (30/min)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes webhook.' },
});

// Webhook public — GeniusPay appelle cette route directement
router.post('/webhook', webhookLimiter, handleWebhook);

// Toutes les autres routes requièrent une authentification
router.use(authenticateToken);

// Status de paiement — réservé ADMIN/ACCOUNTANT
router.get('/geniuspay/status/:reference', requireRole(['ADMIN', 'ACCOUNTANT']), checkPaymentStatus);

router.get('/my-payments', getMyPayments);
router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getPayments);
router.post('/initialize', requireRole(['ADMIN', 'ACCOUNTANT']), initializePayment);
router.post('/verify', requireRole(['ADMIN', 'ACCOUNTANT']), verifyPayment);
router.post('/geniuspay/init', requireRole(['ADMIN', 'ACCOUNTANT']), initPayment);

export default router;
