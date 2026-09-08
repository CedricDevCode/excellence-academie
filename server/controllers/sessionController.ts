import { Request, Response } from 'express';
import crypto from 'crypto';
import { sendNotification } from './notificationController';
import prisma from '../utils/prisma';
import { GENIUSPAY_API_BASE, GENIUSPAY_ENVIRONMENT, geniusPayHeaders } from '../utils/geniuspay';

async function ensureTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CourseSession" (
        id TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL REFERENCES "User"(id),
        "courseId" TEXT REFERENCES "Course"(id),
        "weekLabel" TEXT NOT NULL,
        "weekStart" TIMESTAMP NOT NULL,
        "weekEnd" TIMESTAMP NOT NULL,
        date TIMESTAMP NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        hours REAL NOT NULL,
        type TEXT NOT NULL DEFAULT 'PRESENTIEL',
        location TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        "notified" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (e) {
    // Table may already exist
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hourlyRate" REAL
    `);
  } catch (e) {
    // Column may already exist
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SessionFile" (
        id TEXT PRIMARY KEY,
        "sessionId" TEXT NOT NULL REFERENCES "CourseSession"(id),
        "fileName" TEXT NOT NULL,
        "fileType" TEXT NOT NULL DEFAULT 'application/octet-stream',
        "fileData" TEXT NOT NULL,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (e) {
    // Table may already exist
  }
  try {
    // Drop old TeacherSession table if it exists (migration)
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TeacherSession"`);
  } catch (e) {
    // ignore
  }
}

ensureTable();

function computeHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.round(((eh + em / 60) - (sh + sm / 60)) * 100) / 100;
}

function getWeekInfo(dateStr: string): { weekStart: Date; weekEnd: Date; weekLabel: string } {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const fmt = (dt: Date) => dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const label = `Semaine du ${fmt(start)} au ${fmt(end)} ${end.getFullYear()}`;
  return { weekStart: start, weekEnd: end, weekLabel: label };
}

export const createSession = async (req: Request, res: Response) => {
  try {
    const { teacherId, courseId, date, startTime, endTime, type, location, description, notifyStudents } = req.body;

    if (!teacherId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'teacherId, date, startTime et endTime sont requis' });
    }

    const hours = computeHours(startTime, endTime);
    if (hours <= 0) {
      return res.status(400).json({ error: "L'heure de fin doit être après l'heure de début" });
    }

    const { weekStart, weekEnd, weekLabel } = getWeekInfo(date);
    const id = crypto.randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "CourseSession"
       (id, "teacherId", "courseId", "weekLabel", "weekStart", "weekEnd", date, "startTime", "endTime", hours, type, location, description, status, "notified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SCHEDULED', false, $14, $14)`,
      id, teacherId, courseId || null, weekLabel, weekStart, weekEnd,
      new Date(date), startTime, endTime, hours, type || 'PRESENTIEL',
      location || null, description || null, now
    );

    // Get teacher info for response
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true },
    });

    // Notify students if requested
    if (notifyStudents && courseId) {
      const subscriptions: any[] = await prisma.$queryRawUnsafe(
        `SELECT u.id FROM "User" u
         INNER JOIN "Subscription" s ON u.id = s."userId"
         WHERE s."courseId" = $1 AND s.status = 'ACTIVE'`,
        courseId
      );
      const typeLabel = type === 'ONLINE' ? 'En ligne' : 'Présentiel';
      const dateFormatted = new Date(date).toLocaleDateString('fr-FR');
      for (const sub of subscriptions) {
        await sendNotification(
          sub.id,
          `Nouveau cours programmé : ${typeLabel}`,
          `${typeLabel} le ${dateFormatted} de ${startTime} à ${endTime}${location ? ` - ${location}` : ''}${description ? `\n${description}` : ''}`
        );
      }
    }

    res.status(201).json({
      id, teacherId, courseId: courseId || null, weekLabel, weekStart, weekEnd,
      date: new Date(date), startTime, endTime, hours, type: type || 'PRESENTIEL',
      location: location || null, description: description || null,
      status: 'SCHEDULED', notified: false, teacher,
      createdAt: now, updatedAt: now,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { teacherId, courseId, startDate, endDate, status, groupByWeek } = req.query;

    let sql = `SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email,
               c.id as course_id, c.title as course_title
               FROM "CourseSession" s
               LEFT JOIN "User" u ON s."teacherId" = u.id
               LEFT JOIN "Course" c ON s."courseId" = c.id
               WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (teacherId) { sql += ` AND s."teacherId" = $${paramIdx++}`; params.push(teacherId); }
    if (courseId) { sql += ` AND s."courseId" = $${paramIdx++}`; params.push(courseId); }
    if (status) { sql += ` AND s.status = $${paramIdx++}`; params.push(status); }
    if (startDate) { sql += ` AND s.date >= $${paramIdx++}`; params.push(new Date(startDate as string)); }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      sql += ` AND s.date <= $${paramIdx++}`; params.push(end);
    }

    sql += ' ORDER BY s.date DESC, s."startTime" ASC';

    const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);
    const sessions = rows.map((r: any) => ({
      id: r.id,
      teacherId: r.teacherId,
      courseId: r.courseId,
      weekLabel: r.weekLabel,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      hours: r.hours,
      type: r.type,
      location: r.location,
      description: r.description,
      status: r.status,
      notified: r.notified,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      teacher: r.teacher_id ? { id: r.teacher_id, name: r.teacher_name, email: r.teacher_email } : null,
      course: r.course_id ? { id: r.course_id, title: r.course_title } : null,
    }));

    if (groupByWeek === 'true') {
      const grouped: Record<string, any> = {};
      for (const s of sessions) {
        const key = s.weekLabel;
        if (!grouped[key]) {
          grouped[key] = { weekLabel: key, weekStart: s.weekStart, weekEnd: s.weekEnd, sessions: [], totalHours: 0 };
        }
        grouped[key].sessions.push(s);
        grouped[key].totalHours += s.hours;
      }
      const weeks = Object.values(grouped).sort((a: any, b: any) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
      return res.json({ weeks, total: sessions.length });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, type, location, description, status } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (date !== undefined) {
      const newDate = new Date(date);
      const { weekLabel, weekStart, weekEnd } = getWeekInfo(date);
      updates.push(`date = $${paramIdx++}`); params.push(newDate);
      updates.push(`"weekLabel" = $${paramIdx++}`); params.push(weekLabel);
      updates.push(`"weekStart" = $${paramIdx++}`); params.push(weekStart);
      updates.push(`"weekEnd" = $${paramIdx++}`); params.push(weekEnd);
    }
    if (startTime !== undefined) { updates.push(`"startTime" = $${paramIdx++}`); params.push(startTime); }
    if (endTime !== undefined) { updates.push(`"endTime" = $${paramIdx++}`); params.push(endTime); }
    if (startTime !== undefined && endTime !== undefined) {
      const hours = computeHours(startTime, endTime);
      updates.push(`hours = $${paramIdx++}`); params.push(hours);
    }
    if (type !== undefined) { updates.push(`type = $${paramIdx++}`); params.push(type); }
    if (location !== undefined) { updates.push(`location = $${paramIdx++}`); params.push(location); }
    if (description !== undefined) { updates.push(`description = $${paramIdx++}`); params.push(description); }
    if (status !== undefined) { updates.push(`status = $${paramIdx++}`); params.push(status); }

    updates.push(`"updatedAt" = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE "CourseSession" SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
      ...params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.$executeRawUnsafe('DELETE FROM "CourseSession" WHERE id = $1', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

export const completeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "CourseSession" WHERE id = $1`, id
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Séance introuvable' });
    }
    const session = rows[0];
    if (session.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Vous ne pouvez compléter que vos propres séances' });
    }
    if (session.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Seules les séances planifiées peuvent être marquées comme terminées' });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "CourseSession" SET status = 'COMPLETED', "updatedAt" = NOW() WHERE id = $1`, id
    );

    res.json({ success: true, status: 'COMPLETED' });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
};

export const validateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "CourseSession" WHERE id = $1`, id
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Séance introuvable' });
    }
    const session = rows[0];
    if (session.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Seules les séances terminées peuvent être validées' });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "CourseSession" SET status = 'VALIDATED', "updatedAt" = NOW() WHERE id = $1`, id
    );

    res.json({ success: true, status: 'VALIDATED' });
  } catch (error) {
    console.error('Validate session error:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
};

export const uploadSessionFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "CourseSession" WHERE id = $1`, id
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Séance introuvable' });
    }

    const fileId = crypto.randomUUID();
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SessionFile" (id, "sessionId", "fileName", "fileType", "fileData", "uploadedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      fileId, id, file.originalname, mimeType, base64
    );

    res.status(201).json({
      id: fileId,
      sessionId: id,
      fileName: file.originalname,
      fileType: mimeType,
    });
  } catch (error) {
    console.error('Upload session file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const getSessionFiles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, "sessionId", "fileName", "fileType", "uploadedAt" FROM "SessionFile" WHERE "sessionId" = $1 ORDER BY "uploadedAt" DESC`, id
    );
    const files = rows.map((r: any) => ({
      id: r.id,
      sessionId: r.sessionId,
      fileName: r.fileName,
      fileType: r.fileType,
      uploadedAt: r.uploadedAt,
    }));
    res.json(files);
  } catch (error) {
    console.error('Get session files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

export const downloadSessionFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "SessionFile" WHERE id = $1`, fileId
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }
    const file = rows[0];
    const buffer = Buffer.from(file.fileData, 'base64');
    res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Download session file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

export const getMonthlySalaryReport = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month !== undefined ? parseInt(month as string) : now.getMonth();
    const y = year !== undefined ? parseInt(year as string) : now.getFullYear();

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email, u."hourlyRate",
              c.id as course_id, c.title as course_title
       FROM "CourseSession" s
       LEFT JOIN "User" u ON s."teacherId" = u.id
       LEFT JOIN "Course" c ON s."courseId" = c.id
       WHERE s.date >= $1 AND s.date <= $2 AND (s.status = 'VALIDATED' OR s.status = 'SCHEDULED' OR s.status = 'COMPLETED')
       ORDER BY s."teacherId", s.date ASC`,
      startDate, endDate
    );

    const defaultRate = 5000;
    const teacherMap: Record<string, any> = {};
    for (const row of rows) {
      const tid = row.teacherId;
      if (!teacherMap[tid]) {
        teacherMap[tid] = {
          teacher: { id: row.teacher_id, name: row.teacher_name, email: row.teacher_email, hourlyRate: row.hourlyRate },
          sessions: [], totalHours: 0, totalPay: 0,
        };
      }
      teacherMap[tid].sessions.push({
        id: row.id, date: row.date, startTime: row.startTime, endTime: row.endTime,
        hours: row.hours, description: row.description, type: row.type, status: row.status,
        course: row.course_id ? { id: row.course_id, title: row.course_title } : null,
      });
      teacherMap[tid].totalHours += row.hours;
      const rate = row.hourlyRate || defaultRate;
      teacherMap[tid].totalPay += row.hours * rate;
    }

    const report = Object.values(teacherMap).map((entry) => ({
      teacher: entry.teacher,
      sessions: entry.sessions,
      totalHours: Math.round(entry.totalHours * 100) / 100,
      totalPay: Math.round(entry.totalPay),
    }));

    const grandTotal = report.reduce((sum, r) => sum + r.totalPay, 0);
    const totalHoursAll = report.reduce((sum, r) => sum + r.totalHours, 0);

    res.json({ month: m, year: y, report, grandTotal, totalHours: totalHoursAll });
  } catch (error) {
    console.error('Monthly salary report error:', error);
    res.status(500).json({ error: 'Failed to generate salary report' });
  }
};

async function processGeniusPayPayout(teacher: any, amount: number, description: string, phone: string): Promise<{ success: boolean; error?: string; reference?: string }> {
  try {
    const walletRes = await fetch(`${GENIUSPAY_API_BASE}/wallets`, {
      headers: geniusPayHeaders(),
    });
    const walletBody = await walletRes.json();
    let walletId = walletBody.data?.wallets?.[0]?.id;

    // If no wallet exists, create one
    if (!walletId) {
      const createRes = await fetch(`${GENIUSPAY_API_BASE}/wallets`, {
        method: 'POST',
        headers: geniusPayHeaders(),
        body: JSON.stringify({
          name: 'Wallet Salaires',
          type: 'payout',
          currency: 'XOF',
        }),
      });
      const createBody = await createRes.json();
      walletId = createBody.data?.id;
    }

    if (!walletId) {
      return { success: false, error: 'Impossible de créer ou récupérer un wallet GeniusPay. Vérifie ton compte GeniusPay.' };
    }

    const payoutRes = await fetch(`${GENIUSPAY_API_BASE}/payouts`, {
      method: 'POST',
      headers: geniusPayHeaders(),
      body: JSON.stringify({
        wallet_id: walletId,
        recipient: {
          name: teacher.name || teacher.email || '',
          phone: phone.replace(/\s/g, ''),
          email: teacher.email || '',
        },
        destination: {
          type: 'mobile_money',
          provider: 'auto',
          account: phone.replace(/\s/g, ''),
        },
        amount,
        currency: 'XOF',
        description,
        metadata: { teacher_id: teacher.id, type: 'salary' },
        idempotency_key: crypto.randomUUID(),
      }),
    });
    const result = await payoutRes.json();

    if (result.success) {
      return { success: true, reference: result.data?.reference || result.data?.id };
    }

    const apiMsg = result.error?.message || result.message || 'Paiement GeniusPay refusé';
    const env = GENIUSPAY_ENVIRONMENT;
    if (env === 'sandbox') {
      return {
        success: true,
        reference: `SANDBOX-${crypto.randomUUID().slice(0, 8)}`,
        error: `⚠️ Mode sandbox : paiement simulé. ${apiMsg}`,
      };
    }
    return { success: false, error: apiMsg };
  } catch (e: any) {
    const env = GENIUSPAY_ENVIRONMENT;
    if (env === 'sandbox') {
      return {
        success: true,
        reference: `SANDBOX-${crypto.randomUUID().slice(0, 8)}`,
        error: '⚠️ Mode sandbox : paiement simulé (API non disponible)',
      };
    }
    return { success: false, error: `Erreur réseau GeniusPay: ${e.message}` };
  }
}

export const payTeacherSalary = async (req: Request, res: Response) => {
  try {
    const { teacherId, amount, month, year, description, paymentMethod, bonus, geniusPhone } = req.body;

    if (!teacherId || !amount) {
      return res.status(400).json({ error: 'teacherId et amount sont requis' });
    }

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(404).json({ error: 'Enseignant introuvable' });
    }

    const bonusAmount = bonus ? parseFloat(bonus) : 0;
    const totalAmount = parseFloat(amount) + bonusAmount;

    const descParts = [description || `Salaire ${month + 1}/${year} - ${teacher.name || teacher.email}`];
    if (bonusAmount > 0) {
      descParts.push(`Bonus: ${bonusAmount.toLocaleString('fr-FR')} FCFA`);
    }
    const fullDescription = descParts.join(' | ');
    let gpReference: string | null = null;

    // If GeniusPay, initiate payout before recording expense
    if (paymentMethod === 'GeniusPay') {
      if (!geniusPhone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis pour le paiement GeniusPay' });
      }
      const payoutResult = await processGeniusPayPayout(teacher, totalAmount, fullDescription, geniusPhone);
      if (!payoutResult.success) {
        return res.status(400).json({
          error: payoutResult.error || 'Échec du paiement GeniusPay',
          hint: 'Utilise un autre moyen de paiement (Virement, Mobile Money...) ou vérifie la configuration GeniusPay.',
        });
      }
      gpReference = payoutResult.reference || null;
      if (payoutResult.error) {
        console.warn('GeniusPay warning:', payoutResult.error);
      }
    }

    const finalDescription = gpReference
      ? `${fullDescription} | GeniusPay ref: ${gpReference}`
      : fullDescription;

    const expense = await prisma.expense.create({
      data: {
        amount: totalAmount,
        description: finalDescription,
        category: 'SALAIRE',
        teacherId,
        paymentMethod: paymentMethod || 'Virement',
        status: 'PAID',
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
      },
    });

    const m = month !== undefined ? parseInt(month) : new Date().getMonth();
    const y = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);

    await prisma.$executeRawUnsafe(
      `UPDATE "CourseSession" SET status = 'PAID', "updatedAt" = NOW()
       WHERE "teacherId" = $1 AND date >= $2 AND date <= $3 AND status IN ('VALIDATED', 'COMPLETED', 'SCHEDULED')`,
      teacherId, startDate, endDate
    );

    res.status(201).json(expense);
  } catch (error) {
    console.error('Pay teacher salary error:', error);
    res.status(500).json({ error: 'Failed to pay teacher salary' });
  }
};

// Get student sessions (for StudentDashboard)
export const getStudentSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Get student's active course subscriptions
    const subscriptions: any[] = await prisma.$queryRawUnsafe(
      `SELECT "courseId" FROM "Subscription" WHERE "userId" = $1 AND status = 'ACTIVE'`,
      userId
    );
    const courseIds = subscriptions.map((s: any) => s.courseId);
    if (courseIds.length === 0) {
      return res.json({ weeks: [], total: 0 });
    }

    let sql = `SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email,
               c.id as course_id, c.title as course_title
               FROM "CourseSession" s
               LEFT JOIN "User" u ON s."teacherId" = u.id
               LEFT JOIN "Course" c ON s."courseId" = c.id
               WHERE s."courseId" IN (${courseIds.map((_: any, i: number) => `$${i + 1}`).join(',')}) AND s.status IN ('SCHEDULED', 'COMPLETED', 'VALIDATED')`;
    const params: any[] = [...courseIds];
    let paramIdx = courseIds.length + 1;

    if (startDate) { sql += ` AND s.date >= $${paramIdx++}`; params.push(new Date(startDate as string)); }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      sql += ` AND s.date <= $${paramIdx++}`; params.push(end);
    }

    sql += ' ORDER BY s.date ASC, s."startTime" ASC';

    const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);
    const sessions = rows.map((r: any) => ({
      id: r.id, teacherId: r.teacherId, courseId: r.courseId,
      weekLabel: r.weekLabel, weekStart: r.weekStart, weekEnd: r.weekEnd,
      date: r.date, startTime: r.startTime, endTime: r.endTime,
      hours: r.hours, type: r.type, location: r.location,
      description: r.description, status: r.status,
      teacher: r.teacher_id ? { id: r.teacher_id, name: r.teacher_name, email: r.teacher_email } : null,
      course: r.course_id ? { id: r.course_id, title: r.course_title } : null,
    }));

    // Group by week
    const grouped: Record<string, any> = {};
    for (const s of sessions) {
      const key = s.weekLabel;
      if (!grouped[key]) {
        grouped[key] = { weekLabel: key, weekStart: s.weekStart, weekEnd: s.weekEnd, sessions: [] };
      }
      grouped[key].sessions.push(s);
    }
    const weeks = Object.values(grouped).sort((a: any, b: any) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

    res.json({ weeks, total: sessions.length });
  } catch (error) {
    console.error('Get student sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};
