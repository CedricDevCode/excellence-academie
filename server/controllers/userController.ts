import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          include: {
            course: true,
          }
        },
        payments: {
          include: {
            course: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, prenom, nom, role, telephone, ville, hourlyRate } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, mot de passe et rôle sont requis' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = name || [prenom, nom].filter(Boolean).join(' ').trim() || email;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        role: role || 'TEACHER',
        telephone,
        ville,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, password, name, prenom, nom, role, telephone, pays, ville, isActive, image, hourlyRate } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID utilisateur requis' });
    }

    const updateData: any = {};

    if (email !== undefined) updateData.email = email;
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
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const { name, telephone, ville, pays, image, password } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (ville !== undefined) updateData.ville = ville;
    if (pays !== undefined) updateData.pays = pays;
    if (image !== undefined) updateData.image = image;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, telephone: true, ville: true, pays: true, image: true, isActive: true },
    });
    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!id) {
      return res.status(400).json({ error: 'ID utilisateur requis' });
    }

    // Delete all related records in order to respect FK constraints (ON DELETE RESTRICT)
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
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
