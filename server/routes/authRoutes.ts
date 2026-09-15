import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, registerAndPay, confirmPayment, login, logout, getMe } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// ─── Rate limiting sur les routes d'authentification ─────────────────────────
// Protège contre les attaques brute-force et par dictionnaire

/** 10 tentatives de connexion par IP toutes les 15 minutes */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  },
  skipSuccessfulRequests: true, // Ne compte que les échecs
});

/** 5 inscriptions par IP par heure */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop d\'inscriptions depuis cette adresse. Veuillez réessayer dans une heure.',
  },
});

/** 3 tentatives d'initiation de paiement par IP par heure */
const paymentInitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de tentatives de paiement. Veuillez réessayer dans une heure.',
  },
});

// ─── Routes publiques ─────────────────────────────────────────────────────────
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/register', registerLimiter, register);
router.post('/register-and-pay', registerLimiter, paymentInitLimiter, registerAndPay);
router.post('/confirm-payment', confirmPayment);

// ─── Routes protégées ─────────────────────────────────────────────────────────
router.get('/me', authenticateToken, getMe);

export default router;
