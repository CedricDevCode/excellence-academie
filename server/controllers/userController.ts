import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { calcMonthlyTotal, monthlyAmountForCourse } from '../constants';
import { computeNextDueDate } from '../utils/dueDate';

// Champs sûrs à exposer pour un utilisateur (exclut le mot de passe)
const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  telephone: true,
  pays: true,
  ville: true,
  image: true,
  isActive: true,
  matricule: true,
  hourlyRate: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Récupère la liste des utilisateurs — ADMIN uniquement.
 * Supporte la pagination via les query params `page` et `limit`.
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit = Math.min(1000, Math.max(1, parseInt((req.query.limit as string) || '50')));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...USER_SAFE_SELECT,
          subscriptions: {
            select: {
              id: true,
              status: true,
              amount: true,
              nextPayment: true,
              course: { select: { id: true, title: true } },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
              course: { select: { id: true, title: true } },
            },
          },
          parentLinks: {
            select: {
              student: { select: { id: true, name: true, email: true, matricule: true } },
            },
          },
          studentLinks: {
            select: {
              parent: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

/**
 * Crée un utilisateur — ADMIN uniquement.
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, prenom, nom, role, telephone, ville, hourlyRate, studentIds } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, mot de passe et role sont requis' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est deja utilise' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = name || [prenom, nom].filter(Boolean).join(' ').trim() || cleanEmail;

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: fullName,
        role: role || 'TEACHER',
        telephone,
        ville,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      },
      select: USER_SAFE_SELECT,
    });

    // Link parent to students if role is PARENT and studentIds provided
    if (role === 'PARENT' && Array.isArray(studentIds) && studentIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: studentIds.map((sid: string) => ({ parentId: user.id, studentId: sid })),
        skipDuplicates: true,
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erreur lors de la creation de l\'utilisateur' });
  }
};

/**
 * Met à jour un utilisateur — ADMIN uniquement.
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, password, name, prenom, nom, role, telephone, pays, ville, isActive, image, hourlyRate, studentIds, courseIds } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID utilisateur requis' });
    }

    const updateData: any = {};

    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (pays !== undefined) updateData.pays = pays;
    if (ville !== undefined) updateData.ville = ville;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (image !== undefined) updateData.image = image;
    if (hourlyRate !== undefined) updateData.hourlyRate = parseFloat(hourlyRate);

    if (name) {
      updateData.name = name;
    } else if (prenom || nom) {
      updateData.name = [prenom, nom].filter(Boolean).join(' ').trim();
    }

    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT,
    });

    // Update parent-student links if studentIds provided
    if (Array.isArray(studentIds)) {
      await prisma.parentStudent.deleteMany({ where: { parentId: id } });
      if (studentIds.length > 0) {
        await prisma.parentStudent.createMany({
          data: studentIds.map((sid: string) => ({ parentId: id, studentId: sid })),
          skipDuplicates: true,
        });
      }
    }

    // Met à jour les formations d'un étudiant : ajoute les abonnements manquants,
    // réactive ceux qui avaient été annulés et annule ceux retirés de la sélection.
    // Permet de corriger les étudiants inscrits sans formation.
    if (Array.isArray(courseIds) && user.role === 'STUDENT') {
      const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
      const subscriptions = await prisma.subscription.findMany({ where: { userId: id } });
      const byCourse = new Map(subscriptions.map(s => [s.courseId, s]));
      const activeSub = subscriptions.find(s => s.status === 'ACTIVE');
      const formule = activeSub?.formule || 'presentiel';
      const nextPayment = computeNextDueDate(new Date(), 1);

      const totalMonthly = calcMonthlyTotal(courses as any[], false, user.pays || undefined, formule);
      for (const [courseIndex, course] of courses.entries()) {
        const amount = monthlyAmountForCourse(totalMonthly, courseIndex);
        const existing = byCourse.get(course.id);
        if (!existing) {
          await prisma.subscription.create({
            data: {
              userId: id,
              courseId: course.id,
              amount,
              status: 'ACTIVE',
              nextPayment,
              formule,
              coursParticuliers: false,
            },
          });
        } else if (existing.status !== 'ACTIVE') {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE', amount, nextPayment },
          });
        } else if (Number(existing.amount) !== amount) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { amount },
          });
        }
      }

      const keep = new Set(courses.map(c => c.id));
      const toCancel = subscriptions.filter(s => !keep.has(s.courseId) && s.status !== 'CANCELLED');
      if (toCancel.length > 0) {
        await prisma.subscription.updateMany({
          where: { id: { in: toCancel.map(s => s.id) } },
          data: { status: 'CANCELLED' },
        });
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour de l\'utilisateur' });
  }
};

/**
 * Met à jour le profil de l'utilisateur connecté.
 */
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const { name, telephone, ville, pays, image, password } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (ville !== undefined) updateData.ville = ville;
    if (pays !== undefined) updateData.pays = pays;
    if (image !== undefined) updateData.image = image;

    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        telephone: true,
        ville: true,
        pays: true,
        image: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
};

/**
 * Supprime un utilisateur — ADMIN uniquement.
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!id) {
      return res.status(400).json({ error: 'ID utilisateur requis' });
    }

    // Empêcher l'auto-suppression
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    // Suppression en transaction : toutes les données liées doivent partir avant l'utilisateur,
    // sinon PostgreSQL refuse la suppression (contraintes RESTRICT / NO ACTION).
    await prisma.$transaction(async (tx) => {
      // Contrats d'inscription et évaluations
      await tx.contract.deleteMany({ where: { userId: id } });
      await tx.evaluation.deleteMany({ where: { studentId: id } });
      await tx.evaluation.deleteMany({ where: { teacherId: id } });

      // Blog : suppressions de l'auteur, puis de ses articles et de leurs dépendances
      await tx.blogSubmission.deleteMany({ where: { studentId: id } });
      await tx.blogComment.deleteMany({ where: { authorId: id } });
      const authoredPosts = await tx.blogPost.findMany({
        where: { authorId: id },
        select: { id: true },
      });
      const postIds = authoredPosts.map((p) => p.id);
      if (postIds.length > 0) {
        await tx.blogSubmission.deleteMany({ where: { exercise: { postId: { in: postIds } } } });
        await tx.blogExercise.deleteMany({ where: { postId: { in: postIds } } });
        await tx.blogRating.deleteMany({ where: { postId: { in: postIds } } });
        await tx.blogComment.deleteMany({ where: { postId: { in: postIds } } });
        await tx.blogPostTag.deleteMany({ where: { postId: { in: postIds } } });
        await tx.blogPost.deleteMany({ where: { id: { in: postIds } } });
      }

      // Boutique, sessions, paiements et données personnelles
      await tx.review.deleteMany({ where: { userId: id } });
      const shopOrders = await tx.shopOrder.findMany({ where: { userId: id }, select: { id: true } });
      const shopOrderIds = shopOrders.map((o) => o.id);
      if (shopOrderIds.length > 0) {
        await tx.shopOrderItem.deleteMany({ where: { orderId: { in: shopOrderIds } } });
        await tx.shopOrder.deleteMany({ where: { id: { in: shopOrderIds } } });
      }
      await tx.teacherSession.deleteMany({ where: { teacherId: id } });
      // Tables créées en SQL brut (absentes du schéma Prisma) : FK sans ON DELETE
      try {
        await tx.$executeRaw`DELETE FROM "SessionFile" WHERE "sessionId" IN (SELECT id FROM "CourseSession" WHERE "teacherId" = ${id})`;
        await tx.$executeRaw`DELETE FROM "CourseSession" WHERE "teacherId" = ${id}`;
      } catch {
        // Tables de sessions pas encore initialisées : rien à nettoyer.
      }
      await tx.receipt.deleteMany({ where: { userId: id } });
      await tx.payment.deleteMany({ where: { userId: id } });
      await tx.subscription.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.pushSubscription.deleteMany({ where: { userId: id } });
      await tx.expense.deleteMany({ where: { teacherId: id } });
      await tx.calendarEvent.deleteMany({ where: { teacherId: id } });
      await tx.blogRating.deleteMany({ where: { userId: id } });
      await tx.parentStudent.deleteMany({
        where: { OR: [{ parentId: id }, { studentId: id }] },
      });

      // Messagerie : CASCADE côté schéma, nettoyage explicite pour les tables runtime
      await tx.message.deleteMany({ where: { senderId: id } });
      await tx.conversationMember.deleteMany({ where: { userId: id } });

      await tx.user.delete({ where: { id } });
    });

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    const message = error?.code === 'P2025'
      ? 'Utilisateur introuvable.'
      : error?.code === 'P2003'
        ? 'Impossible de supprimer cet utilisateur : des données liées existent encore.'
        : 'Erreur lors de la suppression de l\'utilisateur';
    res.status(500).json({ error: message });
  }
};
