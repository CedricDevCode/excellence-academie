import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { calcRegistrationPrice, calcMonthlyAmount, METHOD_TO_GP } from '../constants';
import { GENIUSPAY_API_BASE, GENIUSPAY_ENVIRONMENT, GENIUSPAY_WEBHOOK_SECRET, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { generateMatricule, generateReceiptNumber } from '../utils/generators';
import { sendDirectEmail } from './notificationController';

export const initPayment = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, formule, successUrl, errorUrl, paymentMethod } = req.body;

    if (!userId || !courseId || !formule) {
      return res.status(400).json({ error: 'userId, courseId et formule sont requis' });
    }

    const amount = calcRegistrationPrice('', 'presentiel', '', false);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: 'Formation introuvable' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const geniusPayBody = {
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
      },
      success_url: successUrl || `${baseUrl}/payment/success`,
      error_url: errorUrl || `${baseUrl}/payment/error`,
    };

    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      (geniusPayBody as Record<string, any>).payment_method = METHOD_TO_GP[paymentMethod];
    }

    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: 'POST',
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
    });

    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: 'Le service de paiement est temporairement indisponible. Veuillez réessayer ou contacter l\'administrateur.',
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
      data: {
        userId,
        courseId,
        amount,
        status: 'PENDING',
        nextPayment,
      },
    });

    res.status(200).json({
      success: true,
      checkoutUrl: paymentMethod && METHOD_TO_GP[paymentMethod]
        ? gpData.payment_url || gpData.checkout_url
        : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      paymentId: payment.id,
      environment: gpData.environment,
    });
  } catch (error: any) {
    console.error('GeniusPay init error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation du paiement' });
  }
};

export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    const reference = req.params.reference as string;

    if (!reference) {
      return res.status(400).json({ error: 'Référence requise' });
    }

    const response = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: geniusPayHeaders(),
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
    } else if (gpData.status === 'failed' || gpData.status === 'cancelled' || gpData.status === 'expired') {
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
      customer: gpData.customer,
      metadata: gpData.metadata,
      environment: gpData.environment,
    });
  } catch (error) {
    console.error('GeniusPay status check error:', error);
    res.status(500).json({ error: 'Erreur de vérification du statut' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const event = req.headers['x-webhook-event'] as string;
    const environment = req.headers['x-webhook-environment'] as string;

    if (!GENIUSPAY_WEBHOOK_SECRET) {
      if (GENIUSPAY_ENVIRONMENT !== 'sandbox') {
        console.warn('GENIUSPAY_WEBHOOK_SECRET not configured. Skipping signature verification.');
      }
    } else if (signature && timestamp) {
      const rawBody = (req as any).rawBody;
      if (rawBody) {
        const data = `${timestamp}.${rawBody}`;
        const expectedSignature = crypto
          .createHmac('sha256', GENIUSPAY_WEBHOOK_SECRET)
          .update(data)
          .digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
          return res.status(401).json({ status: 401, detail: 'Invalid signature' });
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(timestamp, 10);
      if (ts && Math.abs(now - ts) > 300) {
        return res.status(400).json({ status: 400, detail: 'Timestamp too old' });
      }
    }

    const payload = req.body;

    if (event === 'payment.success' || payload.event === 'payment.success') {
      const data = payload.data || payload;
      const reference = data.reference;
      const metadata = data.metadata || {};
      const userId = metadata.user_id;
      const courseId = metadata.course_id;

      // If this is a shop order payment
      if (metadata.action === 'shop_order') {
        const orderId = metadata.order_id;
        if (orderId) {
          const order = await prisma.shopOrder.update({
            where: { id: orderId },
            data: { status: 'PAID' }
          });
          
          // Send payment confirmation email
          try {
            const mailOptions = {
              to: order.customerEmail,
              subject: `Confirmation de paiement - Excellence Académie`,
              html: `<p>Bonjour ${order.customerName},</p>
                     <p>Nous avons bien reçu le paiement de ${order.totalAmount} FCFA pour votre commande (Ref: ${order.id}).</p>
                     <p>Nous la traiterons dans les plus brefs délais.</p>
                     <p>Merci de votre confiance !</p>
                     <p>L'équipe Excellence Académie</p>`
            };
            await sendDirectEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
          } catch (err) {
            console.error('Failed to send shop order payment confirmation email', err);
          }
          console.log(`Webhook: Shop Order paid - ${orderId}`);
        }
      } else if (!userId && metadata.action === 'register') {
        const { email, password_hash, name: fullName, telephone, pays, ville, course_ids, mode, cours_particuliers, monthly_amount } = metadata;
        if (email && password_hash && course_ids) {
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
            const matricule = await generateMatricule();
            await prisma.user.update({ where: { id: user.id }, data: { matricule } });
          }

          const courseIdList: string[] = course_ids ? (Array.isArray(course_ids) ? course_ids : [course_ids]) : [courseId].filter(Boolean);
          const cParticuliers = cours_particuliers === true || cours_particuliers === 'true';
          const cMode = mode || 'presentiel';
          const monthlyAmt = monthly_amount ? parseFloat(monthly_amount) : calcMonthlyAmount(pays || '', cMode, cParticuliers, courseIdList.length);

          const existingPayment = await prisma.payment.findFirst({ where: { geniusPayReference: reference } });
          if (!existingPayment) {
            const payment = await prisma.payment.create({
              data: { amount: data.amount || 0, userId: user.id, status: 'SUCCESS', geniusPayReference: reference },
            });
            const receiptNumber = generateReceiptNumber();
            await prisma.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
          }

          for (const cId of courseIdList) {
            const existingSub = await prisma.subscription.findFirst({ where: { userId: user.id, courseId: cId } });
            if (!existingSub) {
              const np = new Date(); np.setMonth(np.getMonth() + 1);
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  courseId: cId,
                  amount: monthlyAmt,
                  status: 'ACTIVE',
                  nextPayment: np,
                  formule: cMode,
                  coursParticuliers: cParticuliers,
                },
              });
            }
          }
          console.log(`Webhook: User created from payment - ${email}`);
        }
      } else if (metadata.type === 'mensualite' && metadata.subscription_id) {
        // Monthly subscription payment
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
        const sub = await prisma.subscription.findUnique({
          where: { id: metadata.subscription_id },
        });
        if (sub) {
          const nextPayment = new Date(sub.nextPayment);
          nextPayment.setMonth(nextPayment.getMonth() + nbMonths);
          await prisma.subscription.update({
            where: { id: metadata.subscription_id },
            data: { nextPayment, status: 'ACTIVE' },
          });
        }
      } else {
        // Legacy flow: user already exists
        if (reference) {
          await prisma.payment.updateMany({
            where: { geniusPayReference: reference },
            data: { status: 'SUCCESS' },
          });
        }
        if (userId && courseId) {
          await prisma.subscription.updateMany({
            where: { userId, courseId, status: 'PENDING' },
            data: { status: 'ACTIVE' },
          });
          await prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
          });
        }
      }

      console.log(`Webhook: Payment successful - reference: ${reference}`);
    } else if (event === 'payment.failed' || payload.event === 'payment.failed') {
      const data = payload.data || payload;
      const reference = data.reference;

      if (reference) {
        await prisma.payment.updateMany({
          where: { geniusPayReference: reference },
          data: { status: 'FAILED' },
        });
      }

      console.log(`Webhook: Payment failed - reference: ${reference}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(200).json({ received: true });
  }
};
