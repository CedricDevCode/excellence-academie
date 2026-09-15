import { Router } from 'express';
import { getPayments, getMyPayments, initializePayment, verifyPayment } from '../controllers/paymentController';
import { initPayment, checkPaymentStatus, handleWebhook } from '../controllers/geniusPayController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Webhook public — GeniusPay appelle cette route directement
router.post('/webhook', handleWebhook);

// Toutes les autres routes requièrent une authentification
router.use(authenticateToken);

// Status de paiement — protégé (évite les mises à jour de statut non autorisées)
router.get('/geniuspay/status/:reference', checkPaymentStatus);

router.get('/my-payments', getMyPayments);
router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getPayments);
router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);
router.post('/geniuspay/init', initPayment);

export default router;
