import { Router } from 'express';
import { register, registerAndPay, confirmPayment, login, logout, getMe } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/register-and-pay', registerAndPay);
router.post('/confirm-payment', confirmPayment);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);

export default router;
