import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { invalidateUserCache } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const passwordResetTokens = new Map<string, { userId: string; expiresAt: number }>();

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of passwordResetTokens) {
    if (data.expiresAt < now) passwordResetTokens.delete(token);
  }
}
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

async function retryWithNeonWakeup<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try { return await fn(); } catch (err: any) {
      const msg = err?.message || String(err);
      if ((msg.includes("Can't reach database") || msg.includes('P1001') || msg.includes('timeout') || msg.includes('ETIMEDOUT')) && attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  return fn();
}

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const user = await retryWithNeonWakeup(() =>
      prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    );

    if (!user) {
      return res.json({ message: "Si cet email est inscrit, vous recevrez un lien de réinitialisation." });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000;
    passwordResetTokens.set(token, { userId: user.id, expiresAt });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Excellence Académie — Réinitialisation de mot de passe',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#c97e00;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${user.name || ''},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#c97e00;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color:#666;font-size:13px;">Ce lien expire dans 1 heure.</p>
        </div>`,
      });
    } catch (emailError) {
      logger.error('Email send failed', 'password-reset', emailError);
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ message: "Si cet email est inscrit, vous recevrez un lien.", _devResetUrl: resetUrl });
      }
    }

    res.json({ message: "Si cet email est inscrit, vous recevrez un lien de réinitialisation." });
  } catch (error) {
    logger.error('Forgot password error', 'password-reset', error);
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const resetData = passwordResetTokens.get(token);
    if (!resetData || resetData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Token invalide ou expiré.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await retryWithNeonWakeup(() =>
      prisma.user.update({ where: { id: resetData.userId }, data: { password: hashedPassword } })
    );

    passwordResetTokens.delete(token);
    invalidateUserCache(resetData.userId);

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    logger.error('Reset password error', 'password-reset', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
};
