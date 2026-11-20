import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { METHOD_TO_GP } from '../constants';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { generateReceiptNumber } from '../utils/generators';
import { logger } from '../utils/logger';
import { calcRegistrationTotal, calcMonthlyTotal, monthlyAmountForCourse } from '../constants';
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
      if (Number(sub.amount) <= 0) continue;
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
const cashPaymentOtpStore = new Map<string, { subscriptionId: string; months: number; paidAt: string; amount: number; otp: string; expiresAt: number; discountAmount?: number; discountNote?: string; discountDate?: string }>();
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
    const { subscriptionId, months, paidAt, remiseAmount, remiseNote, remiseDate } = req.body || {};
    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId requis' });

    const nbMonths = Math.max(1, Math.min(24, parseInt(String(months), 10) || 1));
    const paidDate = paidAt ? new Date(paidAt) : new Date();
    if (isNaN(paidDate.getTime())) return res.status(400).json({ error: "Date de paiement invalide" });
    if (paidDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) return res.status(400).json({ error: "La date de paiement ne peut pas être dans le futur" });

    const sub = await loadActiveSubscription(String(subscriptionId));
    if (!sub) return res.status(404).json({ error: 'Abonnement introuvable' });
    if (sub.status !== 'ACTIVE') return res.status(400).json({ error: "Cet abonnement n'est pas actif" });
    if (sub.coursParticuliers) return res.status(400).json({ error: "Les cours particuliers n'ont pas de mensualité" });

    const gross = Number(sub.amount || 0) * nbMonths;
    const remise = Math.max(0, Math.min(gross, Math.floor(Number(remiseAmount || 0))));
    if (remise > 0 && !String(remiseNote || '').trim()) {
      return res.status(400).json({ error: "Un justificatif de remise est requis si une remise est appliquée" });
    }
    const amount = gross - remise;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + CASH_PAYMENT_OTP_TTL_MS;

    cashPaymentOtpStore.set(String(req.user.id), {
      subscriptionId: sub.id,
      months: nbMonths,
      paidAt: paidDate.toISOString(),
      amount,
      otp,
      expiresAt,
      discountAmount: remise || undefined,
      discountNote: remise > 0 ? String(remiseNote).trim() : undefined,
      discountDate: remise > 0 ? (remiseDate ? new Date(remiseDate).toISOString() : paidDate.toISOString()) : undefined,
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
          discountAmount: stored.discountAmount || null,
          discountNote: stored.discountNote || null,
          discountDate: stored.discountDate ? new Date(stored.discountDate) : null,
        } as any,
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

// ─── Finaliser l’inscription d’un étudiant (paiement jamais encaissé) ───────
// Pour les étudiants inscrits par l’admin dont le paiement n’a pas été pris
// en compte (ex. après une erreur OTP) : l’admin choisit les formations,
// encaisse en espèces (OTP obligatoire) → crée paiements, abonnements et
// contrat en attente. La prochaine mensualité est définie à partir de la
// date de paiement choisie.
const registrationOtpStore = new Map<string, { userId: string; courseIds: string[]; mode: string; paidAt: string; regPrice: number; monthly: number; amount: number; otp: string; expiresAt: number; discountAmount?: number; discountNote?: string; discountDate?: string }>();
const REGISTRATION_OTP_EMAIL = process.env.CASH_OTP_EMAIL?.trim() || 'ea@exacademie.com';

async function sendRegistrationOtpMail(to: string, otp: string, studentName: string, studentEmail: string, courseTitles: string[], amount: number): Promise<boolean> {
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
      subject: "Code de confirmation - Finalisation d'inscription - Excellence Académie",
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
        <h2 style="color:#c97e00;text-align:center">Finalisation d'inscription</h2>
        <p>Bonjour,</p>
        <p>Un encaissement en espèces est en attente de confirmation pour finaliser l'inscription de <strong>${studentName}</strong> (${studentEmail}) — formation(s) : <strong>${courseTitles.join(', ')}</strong> — montant : <strong>${amount.toLocaleString('fr-FR')} FCFA</strong> :</p>
        <div style="text-align:center;margin:30px 0"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#c97e00;background:#f5f5f5;padding:15px 30px;border-radius:8px">${otp}</span></div>
        <p style="color:#666;font-size:12px">Ce code expire dans 15 minutes. Si vous n'avez pas effectué cette opération, ignorez cet email.</p>
      </div>`,
    });
    return true;
  } catch (err: any) {
    logger.error('Registration completion OTP email delivery failed', 'subscriptions', err);
    return false;
  }
}

function resolvePaidAt(paidAt: any): Date | null {
  const d = paidAt ? new Date(paidAt) : new Date();
  if (isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  return d;
}

// Étape 1 : initie la finalisation (crée l’OTP et l’envoie)
export const initRegistrationCompletion = async (req: Request, res: Response) => {
  try {
    const { userId, courseIds, mode, paidAt, remiseAmount, remiseNote, remiseDate } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    if (!Array.isArray(courseIds) || courseIds.length === 0) return res.status(400).json({ error: 'Au moins une formation est requise' });

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user || user.role !== 'STUDENT') return res.status(404).json({ error: 'Étudiant introuvable' });

    const ids: string[] = courseIds.map((c: any) => String(c));
    const courses = await prisma.course.findMany({ where: { id: { in: ids } } });
    if (courses.length === 0) return res.status(400).json({ error: 'Aucune formation valide sélectionnée' });

    const paidDate = resolvePaidAt(paidAt);
    if (!paidDate) return res.status(400).json({ error: 'Date de paiement invalide' });

    const cMode = String(mode || 'presentiel');
    const regPriceRaw = calcRegistrationTotal(courses as any[], false, user.pays || '', user.ville || '');
    const monthly = calcMonthlyTotal(courses as any[], false, user.pays || '', cMode as any);
    const remise = Math.max(0, Math.min(regPriceRaw, Math.floor(Number(remiseAmount || 0))));
    if (remise > 0 && !String(remiseNote || '').trim()) {
      return res.status(400).json({ error: "Un justificatif de remise est requis si une remise est appliquée" });
    }
    const regPrice = regPriceRaw - remise;
    const amount = regPrice + monthly;

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + CASH_PAYMENT_OTP_TTL_MS;

    registrationOtpStore.set(String(req.user.id), {
      userId: user.id,
      courseIds: courses.map(c => c.id),
      mode: cMode,
      paidAt: paidDate.toISOString(),
      regPrice,
      monthly,
      amount,
      otp,
      expiresAt,
      discountAmount: remise || undefined,
      discountNote: remise > 0 ? String(remiseNote).trim() : undefined,
      discountDate: remise > 0 ? (remiseDate ? new Date(remiseDate).toISOString() : paidDate.toISOString()) : undefined,
    });

    const studentName = user.name || user.email;
    const sent = await sendRegistrationOtpMail(REGISTRATION_OTP_EMAIL, otp, studentName, user.email, courses.map(c => c.title), amount);
    if (!sent) {
      registrationOtpStore.delete(String(req.user.id));
      return res.status(500).json({ error: "Impossible d'envoyer le code de confirmation par email. Réessayez plus tard." });
    }

    res.status(200).json({ ok: true, amount, regPrice, monthly, paidAt: paidDate.toISOString(), otpEmail: REGISTRATION_OTP_EMAIL, expiresAt, expiresInSeconds: Math.floor(CASH_PAYMENT_OTP_TTL_MS / 1000) });
  } catch (error: any) {
    logger.error('Init registration completion error', 'subscriptions', error);
    res.status(500).json({ error: "Erreur lors de l'initialisation" });
  }
};

// Étape 1 bis : renvoi du code
export const resendRegistrationCompletionOtp = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body || {};
    const stored = registrationOtpStore.get(String(req.user.id));
    if (!stored || stored.userId !== String(userId)) {
      return res.status(400).json({ error: 'Aucune finalisation en attente. Veuillez recommencer.' });
    }
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) { registrationOtpStore.delete(String(req.user.id)); return res.status(404).json({ error: 'Étudiant introuvable' }); }
    const courses = await prisma.course.findMany({ where: { id: { in: stored.courseIds } } });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + CASH_PAYMENT_OTP_TTL_MS;
    registrationOtpStore.set(String(req.user.id), { ...stored, otp, expiresAt });

    const studentName = user.name || user.email;
    const sent = await sendRegistrationOtpMail(REGISTRATION_OTP_EMAIL, otp, studentName, user.email, courses.map(c => c.title), stored.amount);
    if (!sent) return res.status(500).json({ error: "Impossible d'envoyer le code de confirmation par email. Réessayez plus tard." });

    res.status(200).json({ ok: true, expiresAt, expiresInSeconds: Math.floor(CASH_PAYMENT_OTP_TTL_MS / 1000) });
  } catch (error: any) {
    logger.error('Resend registration completion OTP error', 'subscriptions', error);
    res.status(500).json({ error: "Erreur lors du renvoi du code" });
  }
};

// Étape 2 : confirmation → crée paiements, abonnements et contrat en attente
export const confirmRegistrationCompletion = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body || {};
    if (!userId || !otp) return res.status(400).json({ error: 'userId et code OTP requis' });

    const stored = registrationOtpStore.get(String(req.user.id));
    if (!stored) return res.status(400).json({ error: 'Aucune finalisation en attente. Veuillez recommencer.' });
    if (stored.userId !== String(userId)) return res.status(400).json({ error: 'Finalisation en attente incohérente. Veuillez recommencer.' });
    if (stored.expiresAt < Date.now()) { registrationOtpStore.delete(String(req.user.id)); return res.status(400).json({ error: 'Le code OTP a expiré. Veuillez recommencer.' }); }
    if (stored.otp !== String(otp).trim()) return res.status(400).json({ error: 'Code OTP incorrect' });

    const paidDate = new Date(stored.paidAt);
    const courses = await prisma.course.findMany({ where: { id: { in: stored.courseIds } } });
    const regPaymentCourseId = courses.length === 1 ? courses[0].id : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: stored.userId } });
      if (!user || user.role !== 'STUDENT') throw new Error('Étudiant introuvable');

      let regPaymentId: string | null = null;
      if (stored.regPrice > 0) {
        const regPayment = await tx.payment.create({
          data: {
            userId: user.id,
            courseId: regPaymentCourseId,
            amount: stored.regPrice,
            status: 'SUCCESS',
              type: 'REGISTRATION',
              receiptNumber: generateReceiptNumber(),
              createdAt: paidDate,
              discountAmount: stored.discountAmount || null,
              discountNote: stored.discountNote || null,
              discountDate: stored.discountDate ? new Date(stored.discountDate) : null,
            } as any,
        });
        regPaymentId = regPayment.id;
      }

      if (stored.monthly > 0) {
        await tx.payment.create({
          data: {
            userId: user.id,
            courseId: regPaymentCourseId,
            amount: stored.monthly,
            status: 'SUCCESS',
            type: 'MONTHLY',
            receiptNumber: generateReceiptNumber(),
            createdAt: paidDate,
          },
        });
      }

      const nextPayment = computeNextDueDate(paidDate, 1);
      for (const [courseIndex, course] of courses.entries()) {
        const amount = monthlyAmountForCourse(stored.monthly, courseIndex);
        const existing = await tx.subscription.findFirst({ where: { userId: user.id, courseId: course.id } });
        if (existing) {
          await tx.subscription.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE', amount, nextPayment, coursParticuliers: false, formule: stored.mode },
          });
        } else {
          await tx.subscription.create({
            data: {
              userId: user.id,
              courseId: course.id,
              amount,
              status: 'ACTIVE',
              nextPayment,
              formule: stored.mode,
              coursParticuliers: false,
            },
          });
        }
      }

      const existingContract = await tx.contract.findFirst({ where: { userId: user.id } });
      if (!existingContract) {
        await tx.contract.create({ data: { userId: user.id, paymentId: regPaymentId } });
      }

      return { nextPayment };
    });

    registrationOtpStore.delete(String(req.user.id));
    res.status(201).json({ ok: true, amount: stored.amount, nextPayment: result.nextPayment.toISOString() });
  } catch (error: any) {
    logger.error('Confirm registration completion error', 'subscriptions', error);
    res.status(500).json({ error: "Erreur lors de la confirmation" });
  }
};
