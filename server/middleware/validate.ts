import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
  name: z.string().max(100).optional(),
  nom: z.string().max(100).optional(),
  prenom: z.string().max(100).optional(),
  telephone: z.string().max(20).optional(),
  pays: z.string().max(100).optional(),
  ville: z.string().max(100).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide').max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis').max(128),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
});

// ─── Evaluation Schemas ──────────────────────────────────────────────────────

export const createEvaluationSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  score: z.number().min(0).max(100).nullable().optional(),
  maxScore: z.number().min(0).max(100).nullable().optional(),
  comments: z.string().max(2000).optional(),
  studentId: z.string().uuid('ID étudiant invalide'),
  courseId: z.string().uuid().nullable().optional(),
});

export const updateEvaluationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  maxScore: z.number().min(0).max(100).nullable().optional(),
  comments: z.string().max(2000).optional(),
});

// ─── Session Schemas ─────────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  teacherId: z.string().uuid('ID enseignant invalide'),
  courseId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure invalide (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure invalide (HH:MM)'),
  type: z.enum(['PRESENTIEL', 'ONLINE'], { errorMap: () => ({ message: 'Type doit être PRESENTIEL ou ONLINE' }) }),
  location: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
  notifyStudents: z.boolean().optional(),
});

// ─── Middleware ───────────────────────────────────────────────────────────────

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        error: 'Données invalides',
        details: errors,
      });
    }
    req.body = result.data;
    next();
  };
}
