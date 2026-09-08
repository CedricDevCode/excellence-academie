import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { setAuthCookie } from '../utils/jwt';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { calcRegistrationPrice, calcMonthlyAmount, METHOD_TO_GP, COUNTRY_TO_ISO2 } from '../constants';
import { generateMatricule, generateReceiptNumber } from '../utils/generators';
import { sendNotification, sendNotificationToRole } from './notificationController';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, nom, prenom, role, telephone, pays, ville } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Le mot de passe est requis' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = name || [prenom, nom].filter(Boolean).join(' ') || email;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        telephone,
        pays,
        ville,
        role: role || 'STUDENT',
        isActive: true,
      }
    });

    if (user.role === 'STUDENT') {
      const matricule = await generateMatricule();
      await prisma.user.update({ where: { id: user.id }, data: { matricule } });
    }

    setAuthCookie(res, user.id, user.role);

    try {
      await sendNotification(user.id, "Bienvenue chez Excellence Académie !", "Votre compte a été créé avec succès. Accédez dès à présent à vos cours, emplois du temps et ressources.");
      await sendNotificationToRole("ADMIN", "Nouvelle inscription", `L'étudiant(e) ${user.name} (${user.email}) vient de s'inscrire sur la plateforme.`);
    } catch (err) {
      console.error('Notification error on registration:', err);
    }

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
};

// Register + Pay: initialize GeniusPay payment, redirect to checkout
export const registerAndPay = async (req: Request, res: Response) => {
  try {
    const { email, password, name, nom, prenom, telephone, pays, ville, courseIds, mode, coursParticuliers, paymentMethod, geniusPhone, dateNaissance } = req.body;

    if (!email || !password || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'Email, mot de passe et au moins un concours sont requis' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ error: 'Une ou plusieurs formations introuvables' });
    }

    const isDiaspora = pays && pays.trim().toLowerCase() !== "côte d'ivoire" && pays.trim().toLowerCase() !== "cote d'ivoire";
    const effectiveMode = isDiaspora ? 'en_ligne' : (mode || 'presentiel');
    const cParticuliers = coursParticuliers === true;

    const registrationAmount = calcRegistrationPrice(pays || '', effectiveMode, ville || '', cParticuliers);
    const monthlyAmount = calcMonthlyAmount(pays || '', effectiveMode, cParticuliers, courseIds.length);
    const amount = registrationAmount + monthlyAmount;

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = name || [prenom, nom].filter(Boolean).join(' ') || email;
    const paymentPhone = geniusPhone || telephone || '';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const courseTitles = courses.map((c: any) => c.title).join(', ');
    const label = cParticuliers ? 'Cours particuliers' : `Inscription (${effectiveMode})`;

    const geniusPayBody: Record<string, any> = {
      amount,
        description: `Inscription + 1er mois: ${fullName} - ${courseTitles} (${label})`,
      customer: {
        name: fullName,
        phone: paymentPhone,
        email,
        country: COUNTRY_TO_ISO2[pays || ''] || 'CI',
      },
      metadata: {
        action: 'register',
        email,
        password_hash: hashedPassword,
        name: fullName,
        telephone: telephone || '',
        genius_phone: paymentPhone,
        pays: pays || '',
        ville: ville || '',
        course_ids: courseIds,
        mode: effectiveMode,
        cours_particuliers: cParticuliers,
        monthly_amount: monthlyAmount,
        payment_method: paymentMethod || '',
        date_naissance: dateNaissance || '',
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
      return res.status(502).json({ error: 'Le service de paiement est temporairement indisponible' });
    }

    const usedUrl = paymentMethod && METHOD_TO_GP[paymentMethod]
      ? gpData.payment_url || gpData.checkout_url
      : gpData.checkout_url || gpData.payment_url;

    res.status(200).json({
      success: true,
      checkoutUrl: usedUrl,
      reference: gpData.reference,
    });
  } catch (error: any) {
    console.error('Register and pay error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation du paiement' });
  }
};

// Confirm payment: check GeniusPay status, create user + payment on success
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Référence requise' });
    }

    const gpResponse = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: {
        'X-API-Key': process.env.GENIUSPAY_API_KEY || '',
        'X-API-Secret': process.env.GENIUSPAY_SECRET_KEY || '',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    const gpData = await handleGeniusPayResponse(gpResponse);
    if (!gpData) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }
    const metadata = gpData.metadata || {};

    if (gpData.status === 'completed' || gpData.status === 'success') {
      const { email, password_hash, name: fullName, telephone, pays, ville, course_ids, mode, cours_particuliers, monthly_amount } = metadata;

      if (!email || !password_hash) {
        return res.status(400).json({ error: 'Données de registration manquantes' });
      }

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            password: password_hash,
            name: fullName || email,
            telephone: telephone || '',
            pays: pays || '',
            ville: ville || '',
            role: 'STUDENT',
            isActive: true,
          },
        });
      }

      if (!user.matricule && user.role === 'STUDENT') {
        const matricule = await generateMatricule();
        await prisma.user.update({ where: { id: user.id }, data: { matricule } });
      }

      const courseIdList: string[] = course_ids ? (Array.isArray(course_ids) ? course_ids : [course_ids]) : [];
      const cParticuliers = cours_particuliers === true || cours_particuliers === 'true';
      const cMode = mode || 'presentiel';

      const inscriptionAmount = calcRegistrationPrice(pays || '', cMode, ville || '', cParticuliers);
      const monthlyAmt = monthly_amount ? parseFloat(monthly_amount) : calcMonthlyAmount(pays || '', cMode, cParticuliers, courseIdList.length);
      const totalAmount = inscriptionAmount + monthlyAmt;

      const existingPayment = await prisma.payment.findFirst({
        where: { geniusPayReference: reference },
      });

      if (!existingPayment) {
        const payment = await prisma.payment.create({
          data: { amount: gpData.amount || totalAmount, userId: user.id, status: 'SUCCESS', geniusPayReference: reference },
        });
        const receiptNumber = generateReceiptNumber();
        await prisma.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
      }

      for (const cId of courseIdList) {
        const existingSub = await prisma.subscription.findFirst({
          where: { userId: user.id, courseId: cId },
        });

        if (!existingSub) {
          const nextPayment = new Date();
          nextPayment.setMonth(nextPayment.getMonth() + 1);
          await prisma.subscription.create({
            data: {
              userId: user.id,
              courseId: cId,
              amount: monthlyAmt,
              status: 'ACTIVE',
              nextPayment,
              formule: cMode,
              coursParticuliers: cParticuliers,
            },
          });
        }
      }

      try {
        await sendNotification(user.id, "Inscription et paiement validés", `Votre paiement de ${totalAmount.toLocaleString('fr-FR')} FCFA a été reçu et validé avec succès. Bienvenue dans votre parcours de formation !`);
        await sendNotificationToRole("ADMIN", "Paiement inscription reçu", `L'étudiant(e) ${user.name} a finalisé son inscription et payé ${totalAmount.toLocaleString('fr-FR')} FCFA.`);
      } catch (err) {
        console.error('Notification error on payment confirmation:', err);
      }

      setAuthCookie(res, user.id, user.role);

      return res.json({
        success: true,
        status: gpData.status,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    }

    res.json({
      success: false,
      status: gpData.status,
      message: 'Le paiement n\'a pas abouti',
    });
  } catch (error: any) {
    console.error('Confirm payment error:', error?.message || error);
    res.status(500).json({ error: 'Erreur de confirmation du paiement' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Tentative de connexion pour : ${email}`);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Helper to retry query if Neon database is cold-starting
    const retryWithNeonWakeup = async <T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (err: any) {
          const msg = err?.message || String(err);
          const isSleepOrConn = msg.includes("Can't reach database") ||
            msg.includes("P1001") ||
            msg.includes("timeout") ||
            msg.includes("Connection terminated") ||
            msg.includes("ETIMEDOUT");
          if (isSleepOrConn && attempt < retries) {
            console.log(`[Neon DB] Base en cours de réveil... tentative ${attempt + 1}/${retries} dans ${delayMs}ms`);
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
          throw err;
        }
      }
      return fn();
    };

    // 1. Query user with fallback if insensitive query fails and retry on Neon wake-up
    let user = null;
    try {
      user = await retryWithNeonWakeup(async () => {
        return await prisma.user.findFirst({
          where: {
            email: {
              equals: cleanEmail,
              mode: 'insensitive'
            }
          }
        });
      });
    } catch (dbErr: any) {
      console.warn('[AUTH] Requête insensitive échouée, essai avec findUnique:', dbErr?.message);
      try {
        user = await retryWithNeonWakeup(async () => {
          return await prisma.user.findUnique({
            where: { email: cleanEmail }
          });
        });
      } catch (innerErr: any) {
        console.error('[AUTH] Erreur base de données critique :', innerErr?.message || innerErr);
        return res.status(500).json({
          error: 'Erreur serveur lors de la connexion',
          details: `Connexion à la base de données impossible : ${innerErr?.message || 'Base non joignable'}. Vérifiez que Neon n'est pas en veille et que DATABASE_URL est correct.`
        });
      }
    }

    // 2. Auto-create default admin account on the fly if missing
    if (!user && cleanEmail === 'admin@excellence.ci') {
      try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        user = await prisma.user.create({
          data: {
            email: 'admin@excellence.ci',
            name: 'Administrateur',
            role: 'ADMIN',
            password: hashedPassword,
            isActive: true,
          }
        });
        console.log('[AUTH] Compte Administrateur auto-initialisé avec succès (admin@excellence.ci / password123)');
      } catch (createErr: any) {
        console.error('[AUTH] Erreur création admin par défaut :', createErr?.message);
      }
    }

    if (!user || !user.password) {
      console.log(`[AUTH] Utilisateur non trouvé : ${cleanEmail}`);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Mot de passe invalide pour : ${cleanEmail}`);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    setAuthCookie(res, user.id, user.role);

    console.log(`[AUTH] Connexion réussie : ${cleanEmail} (${user.role})`);
    res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    res.status(500).json({
      error: 'Erreur serveur lors de la connexion',
      details: error?.message || 'Erreur interne inattendue'
    });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, image: true, telephone: true, ville: true, pays: true, isActive: true, matricule: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};
