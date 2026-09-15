import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

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
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50')));
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
    const { email, password, name, prenom, nom, role, telephone, ville, hourlyRate } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, mot de passe et rôle sont requis' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
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

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
};

/**
 * Met à jour un utilisateur — ADMIN uniquement.
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, password, name, prenom, nom, role, telephone, pays, ville, isActive, image, hourlyRate } = req.body;

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
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT,
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
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

    // Suppression en transaction pour respecter les contraintes FK
    await prisma.$transaction([
      prisma.receipt.deleteMany({ where: { userId: id } }),
      prisma.payment.deleteMany({ where: { userId: id } }),
      prisma.subscription.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.evaluation.deleteMany({ where: { studentId: id } }),
      prisma.evaluation.deleteMany({ where: { teacherId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
};
