import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { METHOD_TO_GP } from '../constants';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { generateReceiptNumber } from '../utils/generators';
import { logger } from '../utils/logger';
import { computeNextDueDate, normalizeDueDay } from '../utils/dueDate';

/**
 * Normalisation unique (au démarrage) : ramène toutes les échéances des
 * abonnements ACTIVE au 5 du même mois. Règle métier : mensualité payable
 * au plus tard le 5 du mois ; au-delà, l'étudiant est "en retard".
 * Idempotente : après une passe, toutes les dates sont déjà le 05.
 */
export async function normalizeSubscriptionDueDates() {
  try {
    const subs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, nextPayment: true },
    });
    let fixed = 0;
    for (const s of subs) {
      if (s.nextPayment && s.nextPayment.getDate() !== 5) {
        await prisma.subscription.update({
          where: { id: s.id },
          data: { nextPayment: normalizeDueDay(s.nextPayment) },
        });
        fixed++;
      }
    }
    if (fixed > 0) console.log(`✅ ${fixed} échéance(s) de mensualité normalisée(s) au 05 du mois`);
    return fixed;
  } catch (err: any) {
    console.warn('⚠️ Normalisation des échéances ignorée :', err?.message || err);
    return 0;
  }
}

export const getSubscriptionsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }
    const subs = await prisma.subscription.findMany({
      where: { userId: userId as string },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subs);
  } catch (error) {
    console.error('Error fetching subscriptions by user:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

export const getMySubscriptions = async (req: Request, res: Response) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: req.user.id },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subs);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

export const getOverdueItems = async (req: Request, res: Response) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: { course: { select: { id: true, title: true } } },
    });

    const now = new Date();
    const allItems: any[] = [];

    for (const sub of subs) {
      const dueDate = new Date(sub.nextPayment);
      if (dueDate > now) continue;

      // Count full months overdue
      let cursor = new Date(dueDate);
      while (cursor <= now) {
        allItems.push({
          id: `${sub.id}-${cursor.toISOString().slice(0, 7)}`,
          subscriptionId: sub.id,
          month: cursor.toISOString().slice(0, 7),
          label: cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          amount: sub.amount,
          courseTitle: sub.course?.title || '',
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    // Remove duplicates (same month + subscription)
    const seen = new Set<string>();
    const items = allItems.filter(item => {
      const key = `${item.subscriptionId}-${item.month}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ items, totalOverdue: items.reduce((s: number, i: any) => s + i.amount, 0) });
  } catch (error) {
    console.error('Error fetching overdue items:', error);
    res.status(500).json({ error: 'Failed to fetch overdue items' });
  }
};

export const paySubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, months, paymentMethod } = req.body;
    const nbMonths = Math.max(1, Math.min(12, parseInt(months) || 1));

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId requis' });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { course: true, user: true },
    });

    if (!sub || sub.userId !== req.user.id) {
      return res.status(404).json({ error: 'Abonnement introuvable' });
    }

    if (sub.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cet abonnement n\'est pas actif' });
    }

    if (sub.coursParticuliers) {
      return res.status(400).json({ error: 'Les cours particuliers n\'ont pas de mensualité' });
    }

    const totalAmount = sub.amount * nbMonths;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const monthsLabel = nbMonths > 1 ? `Mensualités x${nbMonths}` : 'Mensualité';

    const geniusPayBody: Record<string, any> = {
      amount: totalAmount,
      description: `${monthsLabel}: ${sub.user.name || ''} - ${sub.course?.title || ''}`,
      customer: {
        name: sub.user.name || '',
        phone: sub.user.telephone || '',
        email: sub.user.email || '',
      },
      metadata: {
        user_id: req.user.id,
        course_id: sub.courseId,
        subscription_id: sub.id,
        months: nbMonths,
        type: 'mensualite',
      },
      success_url: `${frontendUrl}/student/dashboard`,
      error_url: `${frontendUrl}/student/dashboard`,
    };

    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }

    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: 'POST',
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15000),
    });

    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: 'Le service de paiement est temporairement indisponible. Veuillez réessayer ou contacter l\'administrateur.',
      });
    }

    res.status(200).json({
      success: true,
      checkoutUrl: gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
    });
  } catch (error) {
    console.error('Error paying subscription:', error);
    res.status(500).json({ error: 'Erreur lors du paiement de la mensualité' });
  }
};

// ─── Encaissement espèces depuis l’espace admin (avec OTP) ──────────────────
// L’administrateur enregistre un paiement en espèces pour un abonnement
// (mensualités) : un code OTP à 6 chiffres est envoyé à la boîte mail de
// l’établissement, et la prochaine mensualité est recalculée à partir de la
// date effective du paiement.
const CASH_PAYMENT_OTP_TTL_MS = 15 * 60 * 1000;
const cashPaymentOtpStore = new Map<string, { subscriptionId: string; months: number; paidAt: string; amount: number; otp: string; expiresAt: number }>();
const CASH_PAYMENT_OTP_EMAIL = process.env.CASH_OTP_EMAIL?.trim() || 'ea@exacademie.com';

function buildCashPaymentOtpEmail(otp: string, studentName: string, courseTitle: string, amount: number): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
    <h2 style="color:#c97e00;text-align:center">Encaissement en espèces</h2>
    <p>Bonjour,</p>
    <p>Un encaissement en espèces est en attente de confirmation pour <strong>${studentName}</strong> (${courseTitle}) — montant : <strong>${amount.toLocaleString('fr-FR')} FCFA</strong> :</p>
    <div style="text-align:center;margin:30px 0"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#c97e00;background:#f5f5f5;padding:15px 30px;border-radius:8px">${otp}</span></div>
    <p style="color:#666;font-size:12px">Ce code expire dans 15 minutes. Si vous n'avez pas effectué cette opération, ignorez cet email.</p>
  </div>`;
}

async function sendCashPaymentOtpMail(to: string, otp: string, studentName: string, courseTitle: string, amount: number): Promise<boolean> {
  const nodemailer = await import('nodemailer').catch(() => null);
  if (!nodemailer) return false;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465,
      secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'Code de confirmation - Encaissement espèces',
      html: buildCashPaymentOtpEmail(otp, studentName, courseTitle, amount),
    });
    return true;
  } catch (err: any) {
    logger.error('Cash payment OTP email delivery failed', 'subscriptions', err);
    return false;
  }
}

async function loadActiveSubscription(subscriptionId: string) {
  return prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { course: true, user: true },
  });
}

// Étape 1 : initie l’encaissement (crée l’OTP et l’envoie à l’établissement)
export const initCashPayment = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, months, paidAt } = req.body || {};
    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId requis' });

    const nbMonths = Math.max(1, Math.min(24, parseInt(String(months), 10) || 1));
    const paidDate = paidAt ? new Date(paidAt) : new Date();
    if (isNaN(paidDate.getTime())) return res.status(400).json({ error: "Date de paiement invalide" });
    if (paidDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) return res.status(400).json({ error: "La date de paiement ne peut pas être dans le futur" });

    const sub = await loadActiveSubscription(String(subscriptionId));
    if (!sub) return res.status(404).json({ error: 'Abonnement introuvable' });
    if (sub.status !== 'ACTIVE') return res.status(400).json({ error: "Cet abonnement n'est pas actif" });
    if (sub.coursParticuliers) return res.status(400).json({ error: "Les cours particuliers n'ont pas de mensualité" });

    const amount = Number(sub.amount || 0) * nbMonths;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + CASH_PAYMENT_OTP_TTL_MS;

    cashPaymentOtpStore.set(String(req.user.id), {
      subscriptionId: sub.id,
      months: nbMonths,
      paidAt: paidDate.toISOString(),
      amount,
      otp,
      expiresAt,
    });

    const studentName = sub.user.name || sub.user.email;
    const sent = await sendCashPaymentOtpMail(CASH_PAYMENT_OTP_EMAIL, otp, studentName, sub.course?.title || '—', amount);
    if (!sent) {
      cashPaymentOtpStore.delete(String(req.user.id));
      return res.status(500).json({ error: "Impossible d'envoyer le code de confirmation par email. Réessayez plus tard." });
    }

    logger.info(`Cash payment OTP → ${CASH_PAYMENT_OTP_EMAIL} (student: ${sub.user.email}, course: ${sub.course?.title}, amount: ${amount})`, 'subscriptions');
    res.status(200).json({ ok: true, amount, months: nbMonths, paidAt: paidDate.toISOString(), otpEmail: CASH_PAYMENT_OTP_EMAIL, expiresAt, expiresInSeconds: Math.floor(CASH_PAYMENT_OTP_TTL_MS / 1000) });
  } catch (error: any) {
    logger.error('Init cash payment error', 'subscriptions', error);
    res.status(500).json({ error: "Erreur lors de l'encaissement espèces" });
  }
};

// Étape 1 bis : renvoi du code (uniquement si un encaissement est en attente)
export const resendCashPaymentOtp = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body || {};
    const stored = cashPaymentOtpStore.get(String(req.user.id));
    if (!stored || stored.subscriptionId !== String(subscriptionId)) {
      return res.status(400).json({ error: 'Aucun encaissement en attente. Veuillez recommencer.' });
    }

    const sub = await loadActiveSubscription(stored.subscriptionId);
    if (!sub) { cashPaymentOtpStore.delete(String(req.user.id)); return res.status(404).json({ error: 'Abonnement introuvable' }); }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + CASH_PAYMENT_OTP_TTL_MS;
    cashPaymentOtpStore.set(String(req.user.id), { ...stored, otp, expiresAt });

    const studentName = sub.user.name || sub.user.email;
    const sent = await sendCashPaymentOtpMail(CASH_PAYMENT_OTP_EMAIL, otp, studentName, sub.course?.title || '—', stored.amount);
    if (!sent) return res.status(500).json({ error: "Impossible d'envoyer le code de confirmation par email. Réessayez plus tard." });

    res.status(200).json({ ok: true, expiresAt, expiresInSeconds: Math.floor(CASH_PAYMENT_OTP_TTL_MS / 1000) });
  } catch (error: any) {
    logger.error('Resend cash payment OTP error', 'subscriptions', error);
    res.status(500).json({ error: "Erreur lors du renvoi du code" });
  }
};

// Étape 2 : confirmation par OTP → création du paiement + prochaine mensualité
export const confirmCashPayment = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, otp } = req.body || {};
    if (!subscriptionId || !otp) return res.status(400).json({ error: 'subscriptionId et code OTP requis' });

    const stored = cashPaymentOtpStore.get(String(req.user.id));
    if (!stored) return res.status(400).json({ error: 'Aucun encaissement en attente. Veuillez recommencer.' });
    if (stored.subscriptionId !== String(subscriptionId)) return res.status(400).json({ error: 'Encaissement en attente incohérent. Veuillez recommencer.' });
    if (stored.expiresAt < Date.now()) { cashPaymentOtpStore.delete(String(req.user.id)); return res.status(400).json({ error: 'Le code OTP a expiré. Veuillez recommencer.' }); }
    if (stored.otp !== String(otp).trim()) return res.status(400).json({ error: 'Code OTP incorrect' });

    const paidDate = new Date(stored.paidAt);

    // Transaction atomique : paiement + mise à jour de la prochaine mensualité
    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { id: stored.subscriptionId },
        include: { course: true, user: true },
      });
      if (!sub || sub.status !== 'ACTIVE') throw new Error('Abonnement introuvable ou inactif');

      const payment = await tx.payment.create({
        data: {
          userId: sub.userId,
          courseId: sub.courseId,
          amount: stored.amount,
          status: 'SUCCESS',
          type: 'MONTHLY',
          receiptNumber: generateReceiptNumber(),
          createdAt: paidDate,
        },
      });

      // La prochaine mensualité est définie à partir de la date effective du paiement (échéance le 05)
      const nextPayment = computeNextDueDate(paidDate, stored.months);
      await tx.subscription.update({
        where: { id: sub.id },
        data: { nextPayment },
      });

      return { payment, nextPayment };
    });

    cashPaymentOtpStore.delete(String(req.user.id));
    res.status(201).json({ ok: true, amount: stored.amount, months: stored.months, paidAt: paidDate.toISOString(), nextPayment: result.nextPayment.toISOString(), receiptNumber: result.payment.receiptNumber });
  } catch (error: any) {
    logger.error('Confirm cash payment error', 'subscriptions', error);
    res.status(500).json({ error: "Erreur lors de la confirmation" });
  }
};
