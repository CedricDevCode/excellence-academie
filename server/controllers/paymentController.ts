import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { METHOD_TO_GP } from '../constants';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';

export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      include: {
        course: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    // Determine type: first payment for a (user, course) = INSCRIPTION, rest = MENSUALITE
    const firstPaymentPerCourse: Record<string, string> = {};
    for (let i = payments.length - 1; i >= 0; i--) {
      const key = payments[i].courseId || 'unknown';
      if (!firstPaymentPerCourse[key]) {
        firstPaymentPerCourse[key] = payments[i].id;
      }
    }

    const enriched = payments.map(p => ({
      ...p,
      type: p.id === firstPaymentPerCourse[p.courseId || 'unknown'] ? 'INSCRIPTION' : 'MENSUALITE',
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching my payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const where: any = {};
    if (userId) where.userId = userId as string;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const initializePayment = async (req: Request, res: Response) => {
  try {
    const { amount, userId, courseId, paymentMethod } = req.body;

    const payment = await prisma.payment.create({
      data: { amount, userId, courseId, status: 'PENDING' },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const geniusPayBody: Record<string, any> = {
      amount,
      description: `Paiement inscription - ${user?.name || payment.id}`,
      customer: {
        name: user?.name || '',
        phone: user?.telephone || '',
        email: user?.email || '',
      },
      metadata: { payment_id: payment.id, user_id: userId, course_id: courseId },
      success_url: `${baseUrl}/payment/success`,
      error_url: `${baseUrl}/payment/error`,
    };

    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
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

    await prisma.payment.update({
      where: { id: payment.id },
      data: { geniusPayReference: gpData.reference }
    });

    res.status(200).json({
      success: true,
      checkoutUrl: paymentMethod && METHOD_TO_GP[paymentMethod]
        ? gpData.payment_url || gpData.checkout_url
        : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId, reference } = req.body;

    const response = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: geniusPayHeaders(),
    });

    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }
    const isSuccess = gpData.status === 'completed' || gpData.status === 'success';

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: isSuccess ? 'SUCCESS' : 'FAILED' }
    });

    if (isSuccess) {
      res.status(200).json({ success: true, message: 'Payment verified' });
    } else {
      res.status(400).json({ success: false, message: 'Payment failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};
