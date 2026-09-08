import { Router } from 'express';
import { getReceipts, generateReceipt } from '../controllers/receiptController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getReceipts);
router.post('/:paymentId', requireRole(['ADMIN', 'ACCOUNTANT']), generateReceipt);

export default router;
