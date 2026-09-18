import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const DEFAULT_PRESETS = [
  { name: 'Concours Juridiques & Judiciaires', description: 'Magistrature, Greffe, Avocature, Notariat', color: '#D97706', displayOrder: 1 },
  { name: 'Administration Publique', description: 'ENA, Fonction Publique, EPPJEJ & EPP', color: '#c97e00', displayOrder: 2 },
  { name: 'Sécurité & Force Publique', description: 'Officiers, Sous-Officiers de Police, Gendarmerie, Agent pénitentiaire', color: '#D97706', displayOrder: 3 },
  { name: 'Technologies & Métiers Numériques', description: 'Informatique, Cybersécurité, Réseaux', color: '#1e9e54', displayOrder: 4 },
  { name: 'Santé & Paramédical', description: 'Concours INFAS', color: '#DC2626', displayOrder: 5 },
  { name: 'Éducation & Enseignement', description: 'CAFOP, ENS, Enseignement secondaire', color: '#1e9e54', displayOrder: 6 },
  { name: 'Finances & Gestion', description: 'Trésor, Impôts, Douanes, Comptabilité publique', color: '#059669', displayOrder: 7 },
];

let categoryTableReady: boolean | null = null;

async function isCategoryTableReady(): Promise<boolean> {
  if (categoryTableReady !== null) return categoryTableReady;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Category" LIMIT 1`;
    categoryTableReady = true;
  } catch {
    categoryTableReady = false;
  }
  return categoryTableReady;
}

export const ensureCategoryTable = async (): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT DEFAULT '#c97e00',
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")`);
    categoryTableReady = true;
    console.log('✅ Table Category vérifiée/créée');
  } catch (err) {
    console.warn('⚠️ Impossible de créer la table Category:', err);
    categoryTableReady = false;
  }
};

async function ensureDefaultCategories() {
  const tableReady = await isCategoryTableReady();
  if (!tableReady) return;

  try {
    const count = await prisma.category.count();
    if (count === 0) {
      for (const preset of DEFAULT_PRESETS) {
        await prisma.category.upsert({
          where: { name: preset.name },
          update: {},
          create: preset,
        });
      }
      console.log('✅ Catégories par défaut initialisées en base');
    }
  } catch (err) {
    console.warn('⚠️ Erreur init catégories par défaut:', err);
  }
}

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.json(DEFAULT_PRESETS.map((c, i) => ({ ...c, id: `preset-${i}`, coursesCount: 0 })));
    }

    await ensureDefaultCategories();

    const categories = await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    const counts: Record<string, number> = {};
    try {
      const courses = await prisma.course.findMany({ select: { category: true } });
      for (const c of courses) {
        const catName = c.category?.trim();
        if (catName) {
          counts[catName] = (counts[catName] || 0) + 1;
        }
      }
    } catch (dbErr) {
      console.warn('⚠️ Impossible de compter les cours en base :', dbErr);
    }

    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      displayOrder: cat.displayOrder,
      coursesCount: counts[cat.name] || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur getAllCategories :', error);
    res.json(DEFAULT_PRESETS.map((c, i) => ({ ...c, id: `preset-${i}`, coursesCount: 0 })));
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.status(503).json({ message: 'La table Category n\'est pas encore disponible. Réessayez dans quelques instants.' });
    }

    const { name, description, color, displayOrder } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Le nom de la catégorie est obligatoire' });
    }

    const trimmedName = name.trim();

    const existing = await prisma.category.findUnique({ where: { name: trimmedName } });
    if (existing) {
      return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà' });
    }

    const count = await prisma.category.count();
    const newCategory = await prisma.category.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color?.trim() || '#c97e00',
        displayOrder: Number(displayOrder) || (count + 1),
      },
    });

    res.status(201).json({ ...newCategory, coursesCount: 0 });
  } catch (error) {
    console.error('Erreur createCategory :', error);
    res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.status(503).json({ message: 'La table Category n\'est pas encore disponible.' });
    }

    const { id } = req.params;
    const { name, description, color, displayOrder } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }

    const oldName = existing.name;
    const newName = name !== undefined ? name.trim() : oldName;

    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      const duplicate = await prisma.category.findFirst({
        where: { id: { not: id }, name: { equals: newName, mode: 'insensitive' } },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Ce nom de catégorie est déjà utilisé' });
      }

      try {
        await prisma.course.updateMany({
          where: { category: oldName },
          data: { category: newName },
        });
      } catch (dbErr) {
        console.warn('⚠️ Erreur mise à jour des cours associés :', dbErr);
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: newName,
        description: description !== undefined ? description?.trim() || null : undefined,
        color: color !== undefined ? color?.trim() || '#c97e00' : undefined,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
      },
    });

    res.json(updatedCategory);
  } catch (error) {
    console.error('Erreur updateCategory :', error);
    res.status(500).json({ message: 'Erreur lors de la modification de la catégorie' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.status(503).json({ message: 'La table Category n\'est pas encore disponible.' });
    }

    const { id } = req.params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }

    try {
      await prisma.course.updateMany({
        where: { category: existing.name },
        data: { category: 'Général' },
      });
    } catch (dbErr) {
      console.warn('⚠️ Erreur mise à jour des cours supprimés :', dbErr);
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteCategory :', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
  }
};
