import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { calcRegistrationPrice, calcMonthlyAmount, METHOD_TO_GP } from '../constants';
import { GENIUSPAY_API_BASE, GENIUSPAY_ENVIRONMENT, GENIUSPAY_WEBHOOK_SECRET, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { generateMatricule, generateReceiptNumber } from '../utils/generators';
import { sendDirectEmail } from './notificationController';

// ─── Initialisation de paiement ───────────────────────────────────────────────

export const initPayment = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, formule, successUrl, errorUrl, paymentMethod } = req.body;

    if (!userId || !courseId || !formule) {
      return res.status(400).json({ error: 'userId, courseId et formule sont requis' });
    }

    const amount = calcRegistrationPrice('', 'presentiel', '', false);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, telephone: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: 'Formation introuvable' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const geniusPayBody: Record<string, any> = {
      amount,
      description: `Inscription: ${user.name} - ${course.title} (${formule})`,
      customer: {
        name: user.name || '',
        phone: user.telephone || '',
        email: user.email || '',
      },
      metadata: {
        user_id: userId,
        course_id: courseId,
        formule: formule,
        // Pas de données sensibles dans les métadonnées
      },
      success_url: successUrl || `${baseUrl}/payment/success`,
      error_url: errorUrl || `${baseUrl}/payment/error`,
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
        error: "Le service de paiement est temporairement indisponible. Veuillez réessayer.",
      });
    }

    const payment = await prisma.payment.create({
      data: {
        amount,
        userId,
        courseId,
        status: 'PENDING',
        geniusPayReference: gpData.reference,
      },
    });

    const nextPayment = new Date();
    nextPayment.setMonth(nextPayment.getMonth() + 1);

    await prisma.subscription.create({
      data: { userId, courseId, amount, status: 'PENDING', nextPayment },
    });

    res.status(200).json({
      success: true,
      checkoutUrl:
        paymentMethod && METHOD_TO_GP[paymentMethod]
          ? gpData.payment_url || gpData.checkout_url
          : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      paymentId: payment.id,
      environment: gpData.environment,
    });
  } catch (error: any) {
    console.error('GeniusPay init error:', error);
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement" });
  }
};

// ─── Vérification du statut d'un paiement ────────────────────────────────────

export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    const reference = req.params.reference as string;

    if (!reference) {
      return res.status(400).json({ error: 'Référence requise' });
    }

    const response = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: geniusPayHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }

    if (gpData.status === 'completed' || gpData.status === 'success') {
      await prisma.payment.updateMany({
        where: { geniusPayReference: reference },
        data: { status: 'SUCCESS' },
      });
      await prisma.subscription.updateMany({
        where: { userId: gpData.metadata?.user_id, courseId: gpData.metadata?.course_id },
        data: { status: 'ACTIVE' },
      });
      if (gpData.metadata?.user_id) {
        await prisma.user.update({
          where: { id: gpData.metadata.user_id },
          data: { isActive: true },
        });
      }
    } else if (['failed', 'cancelled', 'expired'].includes(gpData.status)) {
      await prisma.payment.updateMany({
        where: { geniusPayReference: reference },
        data: { status: 'FAILED' },
      });
      await prisma.subscription.updateMany({
        where: { userId: gpData.metadata?.user_id, courseId: gpData.metadata?.course_id },
        data: { status: 'CANCELLED' },
      });
    }

    res.json({
      success: true,
      status: gpData.status,
      reference: gpData.reference,
      amount: gpData.amount,
      fees: gpData.fees,
      netAmount: gpData.net_amount,
      paymentMethod: gpData.payment_method,
      environment: gpData.environment,
      // Ne pas exposer customer et metadata (données personnelles)
    });
  } catch (error) {
    console.error('GeniusPay status check error:', error);
    res.status(500).json({ error: 'Erreur de vérification du statut' });
  }
};

// ─── Webhook GeniusPay ────────────────────────────────────────────────────────

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const event = req.headers['x-webhook-event'] as string;

    const rawBody = (req as any).rawBody;

    // ── Vérification de la signature HMAC ────────────────────────────────────
    if (!GENIUSPAY_WEBHOOK_SECRET) {
      if (GENIUSPAY_ENVIRONMENT !== 'sandbox') {
        // En production, un webhook secret est OBLIGATOIRE
        console.error('[Webhook] GENIUSPAY_WEBHOOK_SECRET non configuré. Webhook rejeté en production.');
        return res.status(401).json({ error: 'Configuration webhook manquante' });
      }
      // En sandbox uniquement, on accepte sans signature (pour les tests)
      console.warn('[Webhook] Mode sandbox : vérification de signature désactivée');
    } else {
      // Vérification stricte : signature ET rawBody obligatoires
      if (!signature || !timestamp || !rawBody) {
        console.warn('[Webhook] Signature, timestamp ou corps brut manquant. Rejeté.');
        return res.status(401).json({ error: 'Données de signature manquantes' });
      }

      const data = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', GENIUSPAY_WEBHOOK_SECRET)
        .update(data)
        .digest('hex');

      // Comparaison en temps constant pour éviter les timing attacks
      if (
        expectedSignature.length !== signature.length ||
        !crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'))
      ) {
        console.warn('[Webhook] Signature invalide. Rejeté.');
        return res.status(401).json({ error: 'Signature invalide' });
      }

      // Vérification de la fraîcheur du timestamp (±5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(timestamp, 10);
      if (!ts || Math.abs(now - ts) > 300) {
        console.warn('[Webhook] Timestamp trop ancien ou invalide. Rejeté.');
        return res.status(400).json({ error: 'Timestamp expiré' });
      }
    }

    const payload = req.body;

    // ── Traitement du succès de paiement ─────────────────────────────────────
    if (event === 'payment.success' || payload.event === 'payment.success') {
      const data = payload.data || payload;
      const reference = data.reference;
      const metadata = data.metadata || {};

      // Commande boutique
      if (metadata.action === 'shop_order') {
        const orderId = metadata.order_id;
        if (orderId) {
          const order = await prisma.shopOrder.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });
          try {
            await sendDirectEmail(
              order.customerEmail,
              `Confirmation de paiement - Excellence Académie`,
              `<p>Bonjour ${order.customerName},</p>
               <p>Nous avons bien reçu le paiement de ${order.totalAmount} FCFA pour votre commande (Ref: ${order.id}).</p>
               <p>Nous la traiterons dans les plus brefs délais.</p>
               <p>Merci de votre confiance !</p>
               <p>L'équipe Excellence Académie</p>`
            );
          } catch (err) {
            console.error('[Webhook] Erreur envoi email commande boutique:', err);
          }
          console.log(`[Webhook] Commande boutique payée : ${orderId}`);
        }

      // Inscription via token sécurisé PendingRegistration
      } else if (metadata.action === 'register' && metadata.pending_token) {
        const pending = await prisma.pendingRegistration.findUnique({
          where: { token: metadata.pending_token },
        });

        if (pending && new Date() <= pending.expiresAt) {
          let user = await prisma.user.findUnique({ where: { email: pending.email } });

          if (!user) {
            user = await prisma.user.create({
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
            const matricule = await generateMatricule();
            await prisma.user.update({ where: { id: user.id }, data: { matricule } });
          }

          const courseIdList: string[] = Array.isArray(pending.courseIds) ? pending.courseIds : [];
          const monthlyAmt = pending.monthlyAmount ?? 0;

          const existingPayment = await prisma.payment.findFirst({
            where: { geniusPayReference: reference },
          });
          if (!existingPayment) {
            const payment = await prisma.payment.create({
              data: { amount: data.amount || 0, userId: user.id, status: 'SUCCESS', geniusPayReference: reference },
            });
            const receiptNumber = generateReceiptNumber();
            await prisma.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
          }

          for (const cId of courseIdList) {
            const existingSub = await prisma.subscription.findFirst({
              where: { userId: user.id, courseId: cId },
            });
            if (!existingSub) {
              const np = new Date();
              np.setMonth(np.getMonth() + 1);
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  courseId: cId,
                  amount: monthlyAmt,
                  status: 'ACTIVE',
                  nextPayment: np,
                  formule: pending.mode || 'presentiel',
                  coursParticuliers: pending.coursParticuliers,
                },
              });
            }
          }

          // Nettoyer les données sensibles
          await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
          console.log(`[Webhook] Utilisateur créé depuis paiement (token sécurisé)`);
        } else {
          console.warn('[Webhook] pending_token expiré ou introuvable:', metadata.pending_token);
        }

      // Paiement mensuel
      } else if (metadata.type === 'mensualite' && metadata.subscription_id) {
        const nbMonths = parseInt(metadata.months) || 1;
        const existingPayment = await prisma.payment.findFirst({
          where: { geniusPayReference: reference },
        });
        if (!existingPayment) {
          const payment = await prisma.payment.create({
            data: {
              amount: data.amount || 0,
              userId: metadata.user_id,
              courseId: metadata.course_id,
              status: 'SUCCESS',
              geniusPayReference: reference,
            },
          });
          const receiptNumber = generateReceiptNumber();
          await prisma.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
        }
        const sub = await prisma.subscription.findUnique({ where: { id: metadata.subscription_id } });
        if (sub) {
          const nextPayment = new Date(sub.nextPayment);
          nextPayment.setMonth(nextPayment.getMonth() + nbMonths);
          await prisma.subscription.update({
            where: { id: metadata.subscription_id },
            data: { nextPayment, status: 'ACTIVE' },
          });
        }

      // Flow legacy (utilisateur existant)
      } else {
        if (reference) {
          await prisma.payment.updateMany({
            where: { geniusPayReference: reference },
            data: { status: 'SUCCESS' },
          });
        }
        const userId = metadata.user_id;
        const courseId = metadata.course_id;
        if (userId && courseId) {
          await prisma.subscription.updateMany({
            where: { userId, courseId, status: 'PENDING' },
            data: { status: 'ACTIVE' },
          });
          await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
        }
      }

      console.log(`[Webhook] Paiement réussi - référence: ${reference}`);

    // ── Paiement échoué ───────────────────────────────────────────────────────
    } else if (event === 'payment.failed' || payload.event === 'payment.failed') {
      const data = payload.data || payload;
      const reference = data.reference;
      const metadata = data.metadata || {};

      if (reference) {
        await prisma.payment.updateMany({
          where: { geniusPayReference: reference },
          data: { status: 'FAILED' },
        });
      }

      // Nettoyer le pending registration si présent
      if (metadata.pending_token) {
        await prisma.pendingRegistration
          .delete({ where: { token: metadata.pending_token } })
          .catch(() => {});
      }

      console.log(`[Webhook] Paiement échoué - référence: ${reference}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Erreur de traitement:', error);
    // Toujours répondre 200 pour éviter les rejeux automatiques GeniusPay
    res.status(200).json({ received: true });
  }
};
