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
