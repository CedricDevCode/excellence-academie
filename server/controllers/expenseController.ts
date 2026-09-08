import { Request, Response } from 'express';
import { sendNotification } from './notificationController';
import prisma from '../utils/prisma';

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { amount, description, category, ville, teacherId, paymentMethod } = req.body;

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        description,
        category: category || null,
        ville: ville || null,
        teacherId: teacherId || null,
        paymentMethod,
        status: 'PAID'
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      }
    });

    if (teacherId) {
      await sendNotification(
        teacherId,
        'Nouveau paiement reçu',
        `Vous avez reçu un paiement de ${amount} FCFA pour : ${description}. Méthode : ${paymentMethod}`
      );
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, category } = req.query;
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (category) {
      where.category = category as string;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description, category, ville, paymentMethod, status, teacherId } = req.body;

    const data: any = {};
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (ville !== undefined) data.ville = ville;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (status !== undefined) data.status = status;
    if (teacherId !== undefined) data.teacherId = teacherId;

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { status: 'PAID' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({ where });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};

    expenses.forEach(e => {
      const cat = e.category || 'AUTRE';
      byCategory[cat] = (byCategory[cat] || 0) + e.amount;

      const monthIdx = new Date(e.createdAt).getMonth();
      const key = `${months[monthIdx]} ${new Date(e.createdAt).getFullYear()}`;
      byMonth[key] = (byMonth[key] || 0) + e.amount;

      const method = e.paymentMethod || 'Non spécifié';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + e.amount;
    });

    res.json({
      totalExpenses,
      count: expenses.length,
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
      byMonth: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })),
      byPaymentMethod: Object.entries(byPaymentMethod).map(([method, amount]) => ({ method, amount })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
};
