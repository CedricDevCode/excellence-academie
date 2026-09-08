import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
    
    const payments = await prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      include: { course: true, user: { select: { ville: true } } }
    });

    const expenses = await prisma.expense.findMany({
      where: { status: 'PAID' }
    });

    const shopOrders = await prisma.shopOrder.findMany({
      where: { status: { in: ['PAID', 'DELIVERED'] } }
    });

    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });

    // Calculate totals
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0) + shopOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group for charts
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const chartDataMap: Record<string, any> = {};
    const enrollmentsMap: Record<string, number> = {};
    const revenueByCourseMap: Record<string, number> = {};
    const revenueByCityMap: Record<string, number> = {};

    payments.forEach(p => {
      const monthIndex = new Date(p.createdAt).getMonth();
      const monthName = months[monthIndex];
      
      if (!chartDataMap[monthName]) chartDataMap[monthName] = { name: monthName, Revenus: 0, Depenses: 0 };
      chartDataMap[monthName].Revenus += p.amount;

      if (!enrollmentsMap[monthName]) enrollmentsMap[monthName] = 0;
      enrollmentsMap[monthName] += 1;

      if (p.course) {
        if (!revenueByCourseMap[p.course.title]) revenueByCourseMap[p.course.title] = 0;
        revenueByCourseMap[p.course.title] += p.amount;
      }

      const city = p.user?.ville?.trim() || 'Non précisée';
      if (!revenueByCityMap[city]) revenueByCityMap[city] = 0;
      revenueByCityMap[city] += p.amount;
    });

    expenses.forEach(e => {
      const monthIndex = new Date(e.createdAt).getMonth();
      const monthName = months[monthIndex];
      if (!chartDataMap[monthName]) chartDataMap[monthName] = { name: monthName, Revenus: 0, Depenses: 0 };
      chartDataMap[monthName].Depenses += e.amount;
    });

    shopOrders.forEach(o => {
      const monthIndex = new Date(o.createdAt).getMonth();
      const monthName = months[monthIndex];
      
      if (!chartDataMap[monthName]) chartDataMap[monthName] = { name: monthName, Revenus: 0, Depenses: 0 };
      chartDataMap[monthName].Revenus += o.totalAmount;

      const city = o.city?.trim() || 'Non précisée';
      if (!revenueByCityMap[city]) revenueByCityMap[city] = 0;
      revenueByCityMap[city] += o.totalAmount;
    });

    // Format final arrays
    const chartData = Object.values(chartDataMap);
    const enrollmentsData = Object.keys(enrollmentsMap).map(k => ({ name: k, Inscriptions: enrollmentsMap[k] }));
    const revenueByCourseData = Object.keys(revenueByCourseMap).map(k => ({ name: k, Revenus: revenueByCourseMap[k] }));
    const revenueByCityData = Object.keys(revenueByCityMap).map(k => ({ name: k, Revenus: revenueByCityMap[k] }));

    res.json({
      totalStudents,
      totalTeachers,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      recentPayments,
      chartData,
      enrollmentsData,
      revenueByCourseData,
      revenueByCityData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getCityBreakdown = async (req: Request, res: Response) => {
  try {
    // Revenus par ville : groupe les paiements SUCCESS par ville de l'étudiant
    const payments = await prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      include: { user: { select: { ville: true } } }
    });

    const revenueByCity: Record<string, { revenue: number; count: number }> = {};
    payments.forEach(p => {
      const city = p.user?.ville?.trim() || 'Non précisée';
      if (!revenueByCity[city]) revenueByCity[city] = { revenue: 0, count: 0 };
      revenueByCity[city].revenue += p.amount;
      revenueByCity[city].count += 1;
    });

    const shopOrders = await prisma.shopOrder.findMany({
      where: { status: { in: ['PAID', 'DELIVERED'] } }
    });
    
    shopOrders.forEach(o => {
      const city = o.city?.trim() || 'Non précisée';
      if (!revenueByCity[city]) revenueByCity[city] = { revenue: 0, count: 0 };
      revenueByCity[city].revenue += o.totalAmount;
      revenueByCity[city].count += 1;
    });

    // Dépenses par ville
    const expenses = await prisma.expense.findMany({
      where: { status: 'PAID' },
      select: { amount: true, ville: true }
    });

    const expenseByCity: Record<string, { expense: number; count: number }> = {};
    expenses.forEach(e => {
      const city = e.ville?.trim() || 'Non précisée';
      if (!expenseByCity[city]) expenseByCity[city] = { expense: 0, count: 0 };
      expenseByCity[city].expense += e.amount;
      expenseByCity[city].count += 1;
    });

    // Fusionner toutes les villes
    const allCities = new Set([...Object.keys(revenueByCity), ...Object.keys(expenseByCity)]);
    const cityData = Array.from(allCities).map(city => ({
      city,
      revenue: revenueByCity[city]?.revenue || 0,
      revenueCount: revenueByCity[city]?.count || 0,
      expense: expenseByCity[city]?.expense || 0,
      expenseCount: expenseByCity[city]?.count || 0,
      net: (revenueByCity[city]?.revenue || 0) - (expenseByCity[city]?.expense || 0),
    })).sort((a, b) => b.revenue - a.revenue);

    res.json(cityData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch city breakdown' });
  }
};
