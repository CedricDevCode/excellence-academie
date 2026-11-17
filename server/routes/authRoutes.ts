import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, registerAndPay, confirmPayment, registerCash, confirmCashRegistration, resendCashRegistrationOtp, login, logout, getMe, addCourseForExistingStudent } from '../controllers/authController';
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

/** Inscriptions : limite par défaut généreuse car plusieurs étudiants s'inscrivent
 *  souvent depuis la même adresse (établissement, cybercafé, réseau partagé).
 *  Configurable via REGISTER_RATE_MAX / REGISTER_RATE_WINDOW_MS. */
const registerLimiter = rateLimit({
  windowMs: Number(process.env.REGISTER_RATE_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.REGISTER_RATE_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop d'inscriptions depuis cette adresse. Veuillez réessayer dans une heure.",
  },
});

/** Inscriptions en espèces : réalisées par le personnel pour plusieurs étudiants
 *  d'affilée, donc limite nettement plus élevée que l'inscription publique. */
const cashRegisterLimiter = rateLimit({
  windowMs: Number(process.env.REGISTER_RATE_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.CASH_REGISTER_RATE_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop d'inscriptions en espèces depuis cette adresse. Veuillez réessayer dans une heure.",
  },
});

/** Initiations de paiement : une même adresse peut inscrire plusieurs étudiants. */
const paymentInitLimiter = rateLimit({
  windowMs: Number(process.env.REGISTER_RATE_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.PAYMENT_INIT_RATE_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de tentatives de paiement depuis cette adresse. Veuillez réessayer dans une heure.',
  },
});

// ─── Routes publiques ─────────────────────────────────────────────────────────
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.post('/register', registerLimiter, validateBody(registerSchema), register);
router.post('/register-and-pay', registerLimiter, paymentInitLimiter, validateBody(registerSchema), registerAndPay);
router.post('/register-cash', cashRegisterLimiter, registerCash);
router.post('/resend-cash-registration-otp', cashRegisterLimiter, resendCashRegistrationOtp);
router.post('/confirm-cash-registration', confirmCashRegistration);
router.post('/forgot-password', loginLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

// ─── Routes protégées ─────────────────────────────────────────────────────────
router.get('/me', authenticateToken, getMe);
router.post('/confirm-payment', authenticateToken, confirmPayment);
// Ajout d'une nouvelle formation pour un étudiant déjà inscrit
router.post('/add-course', authenticateToken, paymentInitLimiter, addCourseForExistingStudent);

export default router;
