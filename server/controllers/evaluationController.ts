import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getEvaluations = async (req: Request, res: Response) => {
  try {
    const { studentId, courseId, teacherId } = req.query;
    const where: any = {};
    if (studentId) where.studentId = studentId as string;
    if (courseId) where.courseId = courseId as string;
    if (teacherId) where.teacherId = teacherId as string;

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(evaluations);
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
};

export const createEvaluation = async (req: Request, res: Response) => {
  try {
    const { title, score, maxScore, comments, studentId, courseId } = req.body;

    if (!title || !studentId) {
      return res.status(400).json({ error: 'Le titre et l\'étudiant sont requis' });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        title,
        score: score ? Number(score) : null,
        maxScore: maxScore ? Number(maxScore) : null,
        comments,
        studentId,
        courseId: courseId || null,
        teacherId: req.user.id,
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(evaluation);
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({ error: 'Failed to create evaluation' });
  }
};

export const updateEvaluation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, score, maxScore, comments } = req.body;

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(score !== undefined && { score: Number(score) }),
        ...(maxScore !== undefined && { maxScore: Number(maxScore) }),
        ...(comments !== undefined && { comments }),
      },
    });

    res.json(evaluation);
  } catch (error) {
    console.error('Error updating evaluation:', error);
    res.status(500).json({ error: 'Failed to update evaluation' });
  }
};
