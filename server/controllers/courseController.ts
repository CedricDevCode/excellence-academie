import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to normalize route/query params that can be string | string[] | undefined
const asString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category && typeof category === 'string' && category.trim() !== '') {
      where.category = category.trim();
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      include: {
        _count: {
          select: {
            subscriptions: true,
            payments: true,
          }
        }
      }
    });
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des formations" });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, price, category } = req.body;
    
    if (!title || price === undefined) {
      return res.status(400).json({ message: "Le titre et le prix sont obligatoires" });
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        price: Number(price),
        category: category && category.trim() ? category.trim() : "Général",
      },
    });
    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de la formation" });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    // normalize in case the param comes as string[] (defensive)
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = asString(rawId);

    if (!id) {
      return res.status(400).json({ message: "id de la formation requis" });
    }
    const { title, description, price, category } = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        price: price !== undefined ? Number(price) : undefined,
        category: category !== undefined ? (category ? category.trim() : "Général") : undefined,
      },
    });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la formation" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = asString(rawId);

    if (!id) {
      return res.status(400).json({ message: "id de la formation requis" });
    }

    await prisma.course.delete({ where: { id } });
    res.json({ message: "Formation supprimée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression de la formation" });
  }
};
