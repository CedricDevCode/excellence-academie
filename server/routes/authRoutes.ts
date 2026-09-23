import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, registerAndPay, confirmPayment, registerCash, confirmCashRegistration, login, logout, getMe, addCourseForExistingStudent } from '../controllers/authController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateBody, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validate';

const router = Router();

// ─── Rate limiting sur les routes d'authentification ─────────────────────────
// Protège contre les attaques brute-force et par dictionnaire

/** 20 tentatives de connexion par IP toutes les 15 minutes */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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
    error: "Trop d'inscriptions depuis cette adresse. Veuillez réessayer dans une heure.",
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
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.post('/register', registerLimiter, validateBody(registerSchema), register);
router.post('/register-and-pay', registerLimiter, paymentInitLimiter, validateBody(registerSchema), registerAndPay);
router.post('/register-cash', registerLimiter, registerCash);
router.post('/confirm-cash-registration', confirmCashRegistration);
router.post('/forgot-password', loginLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

// ─── Routes protégées ─────────────────────────────────────────────────────────
router.get('/me', authenticateToken, getMe);
router.post('/confirm-payment', authenticateToken, confirmPayment);
// Ajout d'une nouvelle formation pour un étudiant déjà inscrit
router.post('/add-course', authenticateToken, paymentInitLimiter, addCourseForExistingStudent);

export default router;
