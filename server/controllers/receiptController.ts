import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getReceipts = async (req: Request, res: Response) => {
  try {
    const receipts = await prisma.receipt.findMany({
      include: {
        payment: { include: { user: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
};

export const generateReceipt = async (req: Request, res: Response) => {
  try {
    const paymentId = req.params.paymentId as string;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        course: true,
        receipt: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.receipt) {
      return res.json(payment.receipt);
    }

    // Create a new receipt record
    const content = `
      <h1>Reçu de Paiement</h1>
      <p><strong>Académie:</strong> Excellence Académie</p>
      <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
      <p><strong>Étudiant:</strong> ${payment.user?.name || payment.user?.email}</p>
      <p><strong>Montant:</strong> ${payment.amount} FCFA</p>
      <p><strong>Statut:</strong> ${payment.status}</p>
      ${payment.course ? `<p><strong>Cours:</strong> ${payment.course.title}</p>` : ''}
    `;

    const receipt = await prisma.receipt.create({
      data: {
        paymentId: payment.id,
        userId: payment.userId,
        content: content
      }
    });

    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};
