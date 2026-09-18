import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const CONFIG_KEY = 'home';
const MAX_SIZE = 200 * 1024; // 200 Ko max

const isProduction = process.env.NODE_ENV === 'production';
const safeError = (err: any) => isProduction ? undefined : err?.message;

function parseContent(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function getRow() {
  let row = await prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) {
    row = await prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: {},
      create: { key: CONFIG_KEY, content: '{}' },
    });
  }
  return row;
}

// Public — config de la page d'accueil (lecture seule)
export const getPublicConfig = async (_req: Request, res: Response) => {
  try {
    const row = await getRow();
    res.json(parseContent(row.content));
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du chargement de la configuration', error: safeError(error) });
  }
};

// Admin — lecture
export const getConfig = async (_req: Request, res: Response) => {
  try {
    const row = await getRow();
    res.json({ key: row.key, content: parseContent(row.content), updatedAt: row.updatedAt });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du chargement de la configuration', error: safeError(error) });
  }
};

// Admin — mise à jour
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const content = req.body?.content;
    if (content === undefined) {
      return res.status(400).json({ message: 'Le champ "content" est obligatoire' });
    }
    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      return res.status(400).json({ message: '"content" doit être un objet JSON' });
    }
    const serialized = JSON.stringify(content);
    if (serialized.length > MAX_SIZE) {
      return res.status(400).json({ message: 'Configuration trop volumineuse' });
    }

    const row = await prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { content: serialized },
      create: { key: CONFIG_KEY, content: serialized },
    });
    res.json({ key: row.key, content: parseContent(row.content), updatedAt: row.updatedAt });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la sauvegarde de la configuration', error: safeError(error) });
  }
};