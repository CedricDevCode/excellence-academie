import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [totalStudents, totalTeachers] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
    ]);

    // Aggregate payments via SQL instead of loading all rows
    const [paymentAgg, shopAgg, expenseAgg] = await Promise.all([
      prisma.payment.groupBy({
        by: ['courseId'],
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.shopOrder.aggregate({
        where: { status: { in: ['PAID', 'DELIVERED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenueFromPayments = paymentAgg.reduce((s, g) => s + (g._sum.amount || 0), 0);
    const totalRevenueFromShop = shopAgg._sum.totalAmount || 0;
    const totalRevenue = totalRevenueFromPayments + totalRevenueFromShop;
    const totalExpenses = expenseAgg._sum.amount || 0;

    // Monthly chart data — aggregate by month using raw SQL for performance
    const currentYear = new Date().getFullYear();
    const [monthlyPayments, monthlyExpenses, monthlyShopOrders] = await Promise.all([
      prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, SUM("amount")::float AS total
        FROM "Payment" WHERE "status" = 'SUCCESS' AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `,
      prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, SUM("amount")::float AS total
        FROM "Expense" WHERE "status" = 'PAID' AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `,
      prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, SUM("totalAmount")::float AS total
        FROM "ShopOrder" WHERE "status" IN ('PAID','DELIVERED') AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `,
    ]);

    const chartDataMap: Record<string, { name: string; Revenus: number; Depenses: number }> = {};
    for (const m of MONTHS) chartDataMap[m] = { name: m, Revenus: 0, Depenses: 0 };

    for (const row of monthlyPayments) {
      const name = MONTHS[row.month - 1];
      if (chartDataMap[name]) chartDataMap[name].Revenus += row.total;
    }
    for (const row of monthlyShopOrders) {
      const name = MONTHS[row.month - 1];
      if (chartDataMap[name]) chartDataMap[name].Revenus += row.total;
    }
    for (const row of monthlyExpenses) {
      const name = MONTHS[row.month - 1];
      if (chartDataMap[name]) chartDataMap[name].Depenses += row.total;
    }
    const chartData = Object.values(chartDataMap);

    // Revenue by course — aggregate
    const courses = await prisma.course.findMany({ select: { id: true, title: true } });
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const revenueByCourseData = paymentAgg
      .filter(g => g.courseId && courseMap.get(g.courseId))
      .map(g => ({ name: courseMap.get(g.courseId!)!, Revenus: g._sum.amount || 0 }))
      .sort((a, b) => b.Revenus - a.Revenus);

    // Enrollments by month
    const [enrollmentsByMonth] = await Promise.all([
      prisma.$queryRaw<{ month: number; count: bigint }[]>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, COUNT(*)::int AS count
        FROM "Payment" WHERE "status" = 'SUCCESS' AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `,
    ]);
    const enrollmentsData = enrollmentsByMonth.map(e => ({
      name: MONTHS[e.month - 1],
      Inscriptions: Number(e.count),
    }));

    // Revenue by city — aggregate via raw SQL joining User table
    const [revenueByCityRaw, expenseByCityRaw] = await Promise.all([
      prisma.$queryRaw<{ city: string; revenue: number; count: bigint }[]>`
        SELECT COALESCE(u."ville", 'Non précisée') AS city, SUM(p."amount")::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p LEFT JOIN "User" u ON p."userId" = u."id"
        WHERE p."status" = 'SUCCESS'
        GROUP BY city ORDER BY revenue DESC
      `,
      prisma.$queryRaw<{ city: string; expense: number; count: bigint }[]>`
        SELECT COALESCE("ville", 'Non précisée') AS city, SUM("amount")::float AS expense, COUNT(*)::int AS count
        FROM "Expense" WHERE "status" = 'PAID'
        GROUP BY city
      `,
    ]);

    const cityMap = new Map<string, { revenue: number; revenueCount: number; expense: number; expenseCount: number }>();
    for (const r of revenueByCityRaw) {
      cityMap.set(r.city, { revenue: r.revenue, revenueCount: Number(r.count), expense: 0, expenseCount: 0 });
    }
    for (const e of expenseByCityRaw) {
      const existing = cityMap.get(e.city) || { revenue: 0, revenueCount: 0, expense: 0, expenseCount: 0 };
      existing.expense = e.expense;
      existing.expenseCount = Number(e.count);
      cityMap.set(e.city, existing);
    }
    const revenueByCityData = Array.from(cityMap.entries()).map(([city, data]) => ({
      name: city,
      Revenus: data.revenue,
    }));

    // Recent payments (still limited to 5 — tiny)
    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

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
      revenueByCityData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getCityBreakdown = async (req: Request, res: Response) => {
  try {
    const [revenueByCityRaw, expenseByCityRaw] = await Promise.all([
      prisma.$queryRaw<{ city: string; revenue: number; count: bigint }[]>`
        SELECT COALESCE(u."ville", 'Non précisée') AS city, SUM(p."amount")::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p LEFT JOIN "User" u ON p."userId" = u."id"
        WHERE p."status" = 'SUCCESS'
        GROUP BY city ORDER BY revenue DESC
      `,
      prisma.$queryRaw<{ city: string; expense: number; count: bigint }[]>`
        SELECT COALESCE("ville", 'Non précisée') AS city, SUM("amount")::float AS expense, COUNT(*)::int AS count
        FROM "Expense" WHERE "status" = 'PAID'
        GROUP BY city
      `,
    ]);

    const cityMap = new Map<string, { revenue: number; revenueCount: number; expense: number; expenseCount: number }>();
    for (const r of revenueByCityRaw) {
      cityMap.set(r.city, { revenue: r.revenue, revenueCount: Number(r.count), expense: 0, expenseCount: 0 });
    }
    for (const e of expenseByCityRaw) {
      const existing = cityMap.get(e.city) || { revenue: 0, revenueCount: 0, expense: 0, expenseCount: 0 };
      existing.expense = e.expense;
      existing.expenseCount = Number(e.count);
      cityMap.set(e.city, existing);
    }

    const cityData = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        revenue: data.revenue,
        revenueCount: data.revenueCount,
        expense: data.expense,
        expenseCount: data.expenseCount,
        net: data.revenue - data.expense,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(cityData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch city breakdown' });
  }
};
