import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to normalize route/query params that can be string | string[] | undefined
const asString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { title: 'asc' },
    });
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des concours" });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, price } = req.body;
    
    if (!title || price === undefined) {
      return res.status(400).json({ message: "Le titre et le prix sont obligatoires" });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        price: Number(price),
      },
    });
    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création du concours" });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    // normalize in case the param comes as string[] (defensive)
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = asString(rawId);

    if (!id) {
      return res.status(400).json({ message: "id du concours requis" });
    }
    const { title, description, price } = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: {
        title,
        description,
        price: price !== undefined ? Number(price) : undefined,
      },
    });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du concours" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = asString(rawId);

    if (!id) {
      return res.status(400).json({ message: "id du concours requis" });
    }

    await prisma.course.delete({ where: { id } });
    res.json({ message: "Concours supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression du concours" });
  }
};
