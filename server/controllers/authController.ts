import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { setAuthCookie, clearAuthCookie } from '../utils/jwt';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { calcRegistrationTotal, calcMonthlyTotal, METHOD_TO_GP, COUNTRY_TO_ISO2 } from '../constants';
import { generateMatricule, generateReceiptNumber } from '../utils/generators';
import { sendNotification, sendNotificationToRole } from './notificationController';
import { invalidateUserCache } from '../middleware/authMiddleware';
import logger from '../utils/logger';

// ─── Password Reset Token Store (in-memory, TTL 1h) ─────────────────────────
const passwordResetTokens = new Map<string, { userId: string; expiresAt: number }>();

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of passwordResetTokens) {
    if (data.expiresAt < now) passwordResetTokens.delete(token);
  }
}
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Masque un email pour les logs (RGPD) : ex: "user@example.com" → "us**@e***.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const [domainName, ...tld] = domain.split('.');
  const maskedLocal = local.slice(0, 2) + '**';
  const maskedDomain = domainName.slice(0, 1) + '***';
  return `${maskedLocal}@${maskedDomain}.${tld.join('.')}`;
}

/** Envoie un email de bienvenue avec identifiants + reçu de paiement */
async function sendWelcomeEmail(params: {
  email: string; prenom?: string; nom?: string; matricule?: string;
  totalAmount: number; inscriptionAmount: number; monthlyAmount: number;
  courses: string[]; paymentMethod: string; reference?: string;
}) {
  const { email, prenom, nom, matricule, totalAmount, inscriptionAmount, monthlyAmount, courses, paymentMethod, reference } = params;
  const nodemailer = await import('nodemailer').catch(() => null);
  if (!nodemailer) return;

  try {
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465,
      secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const methodLabels: Record<string, string> = {
      wave: 'Wave', orange_money: 'Orange Money', mtn_money: 'MTN MoMo',
      moov_money: 'Moov Money', card: 'Carte bancaire', ESPECES: 'Espèces', especes: 'Espèces',
    };

    const courseList = courses.map(c => `<li style="padding:4px 0;color:#333">${c}</li>`).join('');

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Bienvenue chez Excellence Académie - ${prenom || ''} ${nom || ''}`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <div style="background:linear-gradient(135deg,#f5a623,#c97e00);padding:30px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">Bienvenue chez Excellence Académie !</h1>
          <p style="color:white;margin:8px 0 0;opacity:0.9">Votre inscription a été confirmée</p>
        </div>

        <div style="background:#fff;padding:30px;border:1px solid #e5e5e5;border-top:none">
          <p>Bonjour <strong>${prenom || ''} ${nom || ''}</strong>,</p>
          <p>Nous vous confirmons que votre inscription et votre paiement ont été enregistrés avec succès.</p>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
            <h3 style="margin:0 0 10px;color:#0369a1;font-size:16px">🔑 Vos identifiants de connexion</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 8px;color:#666;width:120px">Email</td><td style="padding:4px 8px;font-weight:bold">${email}</td></tr>
              <tr><td style="padding:4px 8px;color:#666">Mot de passe</td><td style="padding:4px 8px;font-weight:bold">(celui que vous avez choisi lors de l'inscription)</td></tr>
              ${matricule ? `<tr><td style="padding:4px 8px;color:#666">Matricule</td><td style="padding:4px 8px;font-weight:bold;color:#c97e00">${matricule}</td></tr>` : ''}
            </table>
          </div>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0">
            <h3 style="margin:0 0 10px;color:#92400e;font-size:16px">💳 Reçu de paiement</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 8px;color:#666;width:160px">Formations</td><td style="padding:4px 8px;font-weight:bold">${courseList ? '<ul style="margin:0;padding-left:18px">' + courseList + '</ul>' : '—'}</td></tr>
              <tr><td style="padding:4px 8px;color:#666">Frais d'inscription</td><td style="padding:4px 8px;font-weight:bold">${inscriptionAmount.toLocaleString('fr-FR')} FCFA</td></tr>
              <tr><td style="padding:4px 8px;color:#666">1ère mensualité</td><td style="padding:4px 8px;font-weight:bold">${monthlyAmount.toLocaleString('fr-FR')} FCFA</td></tr>
              <tr><td style="padding:4px 8px;color:#666">Mode de paiement</td><td style="padding:4px 8px;font-weight:bold">${methodLabels[paymentMethod] || paymentMethod}</td></tr>
              ${reference ? `<tr><td style="padding:4px 8px;color:#666">Référence</td><td style="padding:4px 8px;font-weight:bold;font-size:12px">${reference}</td></tr>` : ''}
              <tr><td style="padding:8px 8px 0;color:#666;font-size:16px;border-top:2px solid #fde68a"><strong>Total payé</strong></td><td style="padding:8px 8px 0;font-size:20px;font-weight:bold;color:#c97e00;border-top:2px solid #fde68a">${totalAmount.toLocaleString('fr-FR')} FCFA</td></tr>
            </table>
            <p style="margin:12px 0 0;font-size:12px;color:#999">Date : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <p style="text-align:center;margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'https://www.exacademie.net'}/student/dashboard" style="display:inline-block;background:#c97e00;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Accéder à mon espace</a>
          </p>

          <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
            Excellence Académie - Cocody Angré, Abidjan<br>
            Tél: 07 47 43 94 43 | Email: ea@exacademie.net
          </p>
        </div>
      </div>`,
    });
  } catch (err) {
    logger.error('Failed to send welcome email', 'auth', err);
  }
}

/** Retry avec gestion du cold-start Neon DB */
async function retryWithNeonWakeup<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isConnError =
        msg.includes("Can't reach database") ||
        msg.includes('P1001') ||
        msg.includes('timeout') ||
        msg.includes('Connection terminated') ||
        msg.includes('ETIMEDOUT');
      if (isConnError && attempt < retries) {
        console.log(`[Neon DB] Base en cours de réveil... tentative ${attempt + 1}/${retries}`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  return fn();
}

// ─── Inscription simple (sans paiement) ───────────────────────────────────────

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, nom, prenom, telephone, pays, ville } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe sont requis' });
    }

    // Validation minimale du mot de passe
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = name || [prenom, nom].filter(Boolean).join(' ') || cleanEmail;

    // SÉCURITÉ: Toujours forcer STUDENT sur l'inscription publique
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: fullName,
        telephone,
        pays,
        ville,
        role: 'STUDENT',
        isActive: true,
      },
    });

    if (user.role === 'STUDENT') {
      const matricule = await generateMatricule();
      await prisma.user.update({ where: { id: user.id }, data: { matricule } });
    }

    setAuthCookie(res, user.id, user.role);

    try {
      await sendNotification(
        user.id,
        'Bienvenue chez Excellence Académie !',
        'Votre compte a été créé avec succès. Accédez dès à présent à vos cours, emplois du temps et ressources.'
      );
      await sendNotificationToRole(
        'ADMIN',
        'Nouvelle inscription',
        `Un nouvel étudiant vient de s'inscrire sur la plateforme.`
      );
    } catch (err) {
      console.error('Notification error on registration:', err);
    }

    res.status(201).json({ message: 'Compte créé avec succès', userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

// ─── Inscription + Paiement Espèces (OTP) ────────────────────────────────────
const cashOtpStore = new Map<string, { data: any; otp: string; expiresAt: number }>();

export const registerCash = async (req: Request, res: Response) => {
  try {
    const { email, password, name, nom, prenom, telephone, pays, ville, courseIds, mode, coursParticuliers, dateNaissance } = req.body;

    if (!email || !password || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'Email, mot de passe et au moins un concours sont requis' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });

    const validCourses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
    if (validCourses.length === 0) return res.status(400).json({ error: 'Aucun concours valide sélectionné' });

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    const regData = {
      email: cleanEmail, passwordHash, name, nom, prenom, telephone, pays, ville,
      courseIds, mode, coursParticuliers, dateNaissance,
    };

    cashOtpStore.set(cleanEmail, { data: regData, otp, expiresAt: Date.now() + 15 * 60 * 1000 });

    const nodemailer = await import('nodemailer').catch(() => null);
    if (nodemailer) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465,
        secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: cleanEmail,
        subject: 'Code de confirmation - Excellence Académie',
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
          <h2 style="color:#c97e00;text-align:center">Code de confirmation</h2>
          <p>Bonjour ${prenom || name || ''},</p>
          <p>Voici votre code de confirmation pour finaliser votre inscription :</p>
          <div style="text-align:center;margin:30px 0"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#c97e00;background:#f5f5f5;padding:15px 30px;border-radius:8px">${otp}</span></div>
          <p style="color:#666;font-size:12px">Ce code expire dans 15 minutes. Si vous n'avez pas demandé cette inscription, ignorez cet email.</p>
        </div>`
      }).catch(() => {});
    }

    res.status(200).json({ message: 'Code OTP envoyé par email', email: cleanEmail });
  } catch (error: any) {
    logger.error('Cash registration error', 'auth', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
};

export const confirmCashRegistration = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email et code OTP requis' });

    const cleanEmail = email.trim().toLowerCase();
    const stored = cashOtpStore.get(cleanEmail);
    if (!stored) return res.status(400).json({ error: 'Aucune inscription en attente. Veuillez recommencer.' });
    if (stored.expiresAt < Date.now()) { cashOtpStore.delete(cleanEmail); return res.status(400).json({ error: 'Le code OTP a expiré. Veuillez recommencer.' }); }
    if (stored.otp !== otp) return res.status(400).json({ error: 'Code OTP incorrect' });

    const d = stored.data;
    cashOtpStore.delete(cleanEmail);

    const user = await prisma.user.create({
      data: {
        email: d.cleanEmail || cleanEmail, password: d.passwordHash, name: d.name,
        telephone: d.telephone, pays: d.pays, ville: d.ville,
        role: 'STUDENT', isActive: true,
        matricule: await generateMatricule(),
      },
    });

    const regPrice = calcRegistrationTotal(d.pays, d.ville, d.coursParticuliers);
    const monthly = calcMonthlyTotal(d.pays, d.ville, d.mode, d.coursParticuliers);

    await prisma.payment.create({
      data: {
        userId: user.id, amount: regPrice, method: 'ESPECES',
        status: 'SUCCESS', type: 'REGISTRATION',
        reference: await generateReceiptNumber(),
        description: `Frais d'inscription (espèces) - ${new Date().toLocaleDateString('fr-FR')}`,
      },
    });

    for (const cid of d.courseIds) {
      const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
      await prisma.subscription.create({
        data: {
          userId: user.id, courseId: cid, status: 'ACTIVE',
          startDate: new Date(), endDate: nextMonth,
          monthlyAmount: monthly,
        },
      });
    }

    await prisma.payment.create({
      data: {
        userId: user.id, amount: monthly, method: 'ESPECES',
        status: 'SUCCESS', type: 'MONTHLY',
        reference: await generateReceiptNumber(),
        description: `Mensualité - ${new Date().toLocaleDateString('fr-FR')}`,
      },
    });

    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    setAuthCookie(res, token);

    try {
      await sendNotification(user.id, 'Inscription confirmée', `Bienvenue ! Votre inscription a été confirmée. Matricule: ${user.matricule}`);
      await sendNotificationToRole('ADMIN', 'Nouvel étudiant inscrit (espèces)', `${user.name || user.email} - ${user.matricule}`);
      const validCourses = await prisma.course.findMany({ where: { id: { in: d.courseIds } } });
      await sendWelcomeEmail({
        email: cleanEmail, prenom: d.prenom, nom: d.nom,
        matricule: user.matricule || undefined,
        totalAmount: regPrice + monthly, inscriptionAmount: regPrice, monthlyAmount: monthly,
        courses: validCourses.map((c: any) => c.title),
        paymentMethod: 'ESPECES',
      });
    } catch {}

    res.status(201).json({ message: 'Inscription confirmée', user: { id: user.id, email: user.email, name: user.name, role: user.role, matricule: user.matricule } });
  } catch (error: any) {
    logger.error('Confirm cash registration error', 'auth', error);
    res.status(500).json({ error: 'Erreur lors de la confirmation' });
  }
};

// ─── Inscription + Paiement GeniusPay ─────────────────────────────────────────
// SÉCURITÉ : On ne stocke PLUS le password_hash dans les métadonnées GeniusPay.
// On crée un enregistrement temporaire `PendingRegistration` en base,
// et on ne passe que le `token` (UUID) dans les métadonnées.

export const registerAndPay = async (req: Request, res: Response) => {
  try {
    const {
      email, password, name, nom, prenom, telephone, pays, ville,
      courseIds, mode, coursParticuliers, paymentMethod, geniusPhone, dateNaissance,
    } = req.body;

    if (!email || !password || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'Email, mot de passe et au moins un concours sont requis' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Vérifier que les formations existent
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ error: 'Une ou plusieurs formations introuvables' });
    }

    const isDiasporaFlag =
      pays && pays.trim().toLowerCase() !== "côte d'ivoire" && pays.trim().toLowerCase() !== "cote d'ivoire";
    const effectiveMode = isDiasporaFlag ? 'en_ligne' : (mode || 'presentiel');
    const cParticuliers = coursParticuliers === true;

    // ── Calcul zone-based : Diaspora / Intérieur CI / Abidjan ─────────────────
    const registrationAmount = calcRegistrationTotal(courses, cParticuliers, pays, ville);
    const monthlyAmount = calcMonthlyTotal(courses, cParticuliers, pays, effectiveMode);
    const amount = registrationAmount + monthlyAmount;

    // Hash du mot de passe avec coût 12
    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = name || [prenom, nom].filter(Boolean).join(' ') || cleanEmail;
    const paymentPhone = geniusPhone || telephone || '';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Stocker les données d'inscription temporairement en base (expire dans 24h)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pending = await prisma.pendingRegistration.create({
      data: {
        email: cleanEmail,
        passwordHash: hashedPassword,
        name: fullName,
        telephone: telephone || '',
        pays: pays || '',
        ville: ville || '',
        courseIds,
        mode: effectiveMode,
        coursParticuliers: cParticuliers,
        monthlyAmount,
        dateNaissance: dateNaissance || '',
        geniusPhone: paymentPhone,
        expiresAt,
      },
    });

    const courseTitles = courses.map((c: any) => c.title).join(', ');
    const label = cParticuliers ? 'Cours particuliers' : `Inscription (${effectiveMode})`;

    // On passe uniquement le token (UUID) dans les métadonnées — JAMAIS le hash du mot de passe
    const geniusPayBody: Record<string, any> = {
      amount,
      description: `Inscription + 1er mois: ${fullName} - ${courseTitles} (${label})`,
      customer: {
        name: fullName,
        phone: paymentPhone,
        email: cleanEmail,
        country: COUNTRY_TO_ISO2[pays || ''] || 'CI',
      },
      metadata: {
        action: 'register',
        pending_token: pending.token, // Token sécurisé uniquement — pas de données sensibles
      },
      success_url: `${frontendUrl}/payment/success`,
      error_url: `${frontendUrl}/payment/error`,
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
      // Nettoyer l'entrée pending si le paiement n'a pas pu être initié
      await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
      return res.status(502).json({ error: 'Le service de paiement est temporairement indisponible' });
    }

    const usedUrl =
      paymentMethod && METHOD_TO_GP[paymentMethod]
        ? gpData.payment_url || gpData.checkout_url
        : gpData.checkout_url || gpData.payment_url;

    res.status(200).json({
      success: true,
      checkoutUrl: usedUrl,
      reference: gpData.reference,
    });
  } catch (error: any) {
    console.error('Register and pay error:', error?.message || error);
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement" });
  }
};

// ─── Ajout formation supplémentaire (étudiant déjà connecté) ──────────────────
// L'étudiant déjà inscrit peut ajouter une nouvelle formation depuis son dashboard.
// Il paie uniquement : mensualité du cours + additionalCourseAmount (10 000 FCFA par défaut).

export const addCourseForExistingStudent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { courseIds, paymentMethod, geniusPhone, mode } = req.body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'Sélectionnez au moins une formation' });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Vérifier que les formations existent et que l'étudiant n'y est pas déjà inscrit
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ error: 'Une ou plusieurs formations introuvables' });
    }

    // Filtrer celles déjà souscrites
    const existingSubs = await prisma.subscription.findMany({
      where: { userId, courseId: { in: courseIds }, status: 'ACTIVE' },
      select: { courseId: true },
    });
    const alreadySubscribed = existingSubs.map((s: any) => s.courseId);
    const newCourseIds = courseIds.filter((id: string) => !alreadySubscribed.includes(id));

    if (newCourseIds.length === 0) {
      return res.status(400).json({ error: 'Vous êtes déjà inscrit à toutes ces formations' });
    }

    const newCourses = courses.filter((c: any) => newCourseIds.includes(c.id));

    // Récupérer le paramètre de frais supplémentaires
    let additionalAmount = 10000;
    try {
      const settings = await prisma.appSettings.findUnique({ where: { key: 'global' } });
      if (settings) additionalAmount = settings.additionalCourseAmount;
    } catch { /* utiliser la valeur par défaut */ }

    // Montant = mensualité de chaque nouveau cours + additionalCourseAmount
    const pays = user.pays || '';
    const effectiveMode = mode || 'presentiel';
    const monthlyAmount = calcMonthlyTotal(newCourses, false, pays, effectiveMode);
    const amount = monthlyAmount + additionalAmount;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const paymentPhone = geniusPhone || user.telephone || '';
    const courseTitles = newCourses.map((c: any) => c.title).join(', ');

    const geniusPayBody: Record<string, any> = {
      amount,
      description: `Formation supplémentaire: ${user.name} - ${courseTitles}`,
      customer: {
        name: user.name || '',
        phone: paymentPhone,
        email: user.email,
        country: COUNTRY_TO_ISO2[pays] || 'CI',
      },
      metadata: {
        action: 'add_course',
        user_id: userId,
        course_ids: newCourseIds.join(','),
        additional_amount: additionalAmount,
        monthly_amount: monthlyAmount,
      },
      success_url: `${frontendUrl}/student/dashboard?tab=courses&added=1`,
      error_url: `${frontendUrl}/student/dashboard?tab=courses&error=1`,
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
      return res.status(502).json({ error: 'Le service de paiement est temporairement indisponible' });
    }

    const usedUrl =
      paymentMethod && METHOD_TO_GP[paymentMethod]
        ? gpData.payment_url || gpData.checkout_url
        : gpData.checkout_url || gpData.payment_url;

    res.status(200).json({
      success: true,
      checkoutUrl: usedUrl,
      reference: gpData.reference,
      amount,
      monthlyAmount,
      additionalAmount,
    });
  } catch (error: any) {
    console.error('addCourseForExistingStudent error:', error?.message || error);
    res.status(500).json({ error: "Erreur lors de l'ajout de la formation" });
  }
};

// ─── Confirmation du paiement ──────────────────────────────────────────────────
// Récupère les données depuis PendingRegistration via le token sécurisé

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Référence requise' });
    }

    const gpResponse = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: { ...geniusPayHeaders(), Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    const gpData = await handleGeniusPayResponse(gpResponse);
    if (!gpData) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }

    const metadata = gpData.metadata || {};

    if (gpData.status === 'completed' || gpData.status === 'success') {
      const pendingToken = metadata.pending_token;

      if (!pendingToken) {
        return res.status(400).json({ error: 'Token d\'inscription manquant dans les métadonnées' });
      }

      // Récupérer les données depuis la base de données via le token sécurisé
      const pending = await prisma.pendingRegistration.findUnique({
        where: { token: pendingToken },
      });

      if (!pending) {
        return res.status(400).json({
          error: 'Données d\'inscription expirées ou déjà traitées. Contactez le support.',
        });
      }

      if (new Date() > pending.expiresAt) {
        await prisma.pendingRegistration.delete({ where: { id: pending.id } });
        return res.status(400).json({ error: 'Session d\'inscription expirée. Veuillez recommencer.' });
      }

      const courseIdList: string[] = Array.isArray(pending.courseIds) ? pending.courseIds : [];
      const pendingCourses = await prisma.course.findMany({ where: { id: { in: courseIdList } } });
      const inscriptionAmount = calcRegistrationTotal(pendingCourses, pending.coursParticuliers, pending.pays, pending.ville);
      const monthlyAmt = pending.monthlyAmount && pending.monthlyAmount > 0
        ? pending.monthlyAmount
        : calcMonthlyTotal(pendingCourses, pending.coursParticuliers, pending.pays, pending.mode || 'presentiel');
      const totalAmount = inscriptionAmount + monthlyAmt;

      // Transaction atomique : utilisateur + paiement + abonnements
      const result = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({ where: { email: pending.email } });

        if (!user) {
          user = await tx.user.create({
            data: {
              email: pending.email,
              password: pending.passwordHash,
              name: pending.name || pending.email,
              telephone: pending.telephone || '',
              pays: pending.pays || '',
              ville: pending.ville || '',
              role: 'STUDENT',
              isActive: true,
            },
          });
        }

        if (!user.matricule && user.role === 'STUDENT') {
          const matricule = await generateMatricule();
          await tx.user.update({ where: { id: user.id }, data: { matricule } });
        }

        const existingPayment = await tx.payment.findFirst({
          where: { geniusPayReference: reference },
        });

        if (!existingPayment) {
          const payment = await tx.payment.create({
            data: {
              amount: gpData.amount || totalAmount,
              userId: user.id,
              status: 'SUCCESS',
              geniusPayReference: reference,
            },
          });
          const receiptNumber = generateReceiptNumber();
          await tx.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
        }

        for (const cId of courseIdList) {
          const existingSub = await tx.subscription.findFirst({
            where: { userId: user.id, courseId: cId },
          });
          if (!existingSub) {
            const nextPayment = new Date();
            nextPayment.setMonth(nextPayment.getMonth() + 1);
            await tx.subscription.create({
              data: {
                userId: user.id,
                courseId: cId,
                amount: monthlyAmt,
                status: 'ACTIVE',
                nextPayment,
                formule: pending.mode || 'presentiel',
                coursParticuliers: pending.coursParticuliers,
              },
            });
          }
        }

        // Supprimer le pending registration
        await tx.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});

        return user;
      });

      try {
        await sendNotification(
          result.id,
          'Inscription et paiement validés',
          `Votre paiement de ${totalAmount.toLocaleString('fr-FR')} FCFA a été reçu. Bienvenue !`
        );
        await sendNotificationToRole(
          'ADMIN',
          'Paiement inscription reçu',
          `Un nouvel étudiant a finalisé son inscription et payé ${totalAmount.toLocaleString('fr-FR')} FCFA.`
        );
        await sendWelcomeEmail({
          email: result.email,
          prenom: pending.name?.split(' ')[0],
          nom: pending.name?.split(' ').slice(1).join(' '),
          matricule: result.matricule || undefined,
          totalAmount, inscriptionAmount, monthlyAmount: monthlyAmt,
          courses: pendingCourses.map((c: any) => c.title),
          paymentMethod: gpData.payment_method || 'unknown',
          reference,
        });
      } catch (err) {
        console.error('Notification error on payment confirmation:', err);
      }

      setAuthCookie(res, result.id, result.role);

      return res.json({
        success: true,
        status: gpData.status,
        user: { id: result.id, email: result.email, name: result.name, role: result.role },
      });
    }

    res.json({
      success: false,
      status: gpData.status,
      message: "Le paiement n'a pas abouti",
    });
  } catch (error: any) {
    console.error('Confirm payment error:', error?.message || error);
    res.status(500).json({ error: 'Erreur de confirmation du paiement' });
  }
};

// ─── Connexion ────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Format de données invalide' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Recherche de l'utilisateur avec retry Neon
    let user = null;
    try {
      user = await retryWithNeonWakeup(() =>
        prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: 'insensitive' } },
        })
      );
    } catch (dbErr: any) {
      // Fallback si la requête insensitive échoue
      try {
        user = await retryWithNeonWakeup(() =>
          prisma.user.findUnique({ where: { email: cleanEmail } })
        );
      } catch (innerErr: any) {
        console.error('[AUTH] Erreur base de données critique :', innerErr?.message || innerErr);
        return res.status(500).json({
          error: 'Erreur serveur lors de la connexion',
          details: 'Connexion à la base de données impossible.',
        });
      }
    }

    // Message d'erreur identique dans les deux cas (timing attack prevention)
    if (!user || !user.password) {
      // Effectuer une comparaison factice pour éviter les timing attacks
      await bcrypt.compare(password, '$2b$12$invalid.hash.to.prevent.timing.attacks.xxxxxxxx');
      console.log(`[AUTH] Tentative échouée pour : ${maskEmail(cleanEmail)}`);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Mot de passe invalide pour : ${maskEmail(cleanEmail)}`);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administration.' });
    }

    setAuthCookie(res, user.id, user.role);

    // Track last login time
    try {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    } catch { /* non-blocking */ }

    console.log(`[AUTH] Connexion réussie : ${maskEmail(cleanEmail)} (${user.role})`);
    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
};

// ─── Déconnexion ──────────────────────────────────────────────────────────────

export const logout = (req: Request, res: Response) => {
  if (req.user?.id) invalidateUserCache(req.user.id);
  clearAuthCookie(res);
  res.json({ message: 'Déconnexion réussie' });
};

// ─── Profil courant ───────────────────────────────────────────────────────────

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        telephone: true,
        ville: true,
        pays: true,
        isActive: true,
        matricule: true,
        ...(req.user.role === 'PARENT' ? {
          parentLinks: {
            select: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  matricule: true,
                  ville: true,
                  image: true,
                },
              },
            },
          },
        } : {}),
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
};
