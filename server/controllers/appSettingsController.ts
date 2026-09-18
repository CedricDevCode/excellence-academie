import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// ─── Récupérer les paramètres de l'application ────────────────────────────────
export const getAppSettings = async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.appSettings.findUnique({ where: { key: 'global' } });
    if (!settings) {
      // Créer les paramètres par défaut si inexistants
      settings = await prisma.appSettings.create({
        data: { key: 'global', additionalCourseAmount: 10000 },
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('getAppSettings error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
};

// ─── Mettre à jour les paramètres (ADMIN only) ────────────────────────────────
export const updateAppSettings = async (req: Request, res: Response) => {
  try {
    const { additionalCourseAmount } = req.body;

    if (additionalCourseAmount !== undefined && (isNaN(Number(additionalCourseAmount)) || Number(additionalCourseAmount) < 0)) {
      return res.status(400).json({ error: 'Le montant doit être un nombre positif' });
    }

    const data: any = {};
    if (additionalCourseAmount !== undefined) data.additionalCourseAmount = Number(additionalCourseAmount);

    const settings = await prisma.appSettings.upsert({
      where: { key: 'global' },
      update: data,
      create: { key: 'global', additionalCourseAmount: data.additionalCourseAmount ?? 10000 },
    });

    res.json(settings);
  } catch (error) {
    console.error('updateAppSettings error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
};
