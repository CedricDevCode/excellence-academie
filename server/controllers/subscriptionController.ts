import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { METHOD_TO_GP } from '../constants';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';

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
