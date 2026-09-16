import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const DEFAULT_PRESETS = [
  { name: 'Concours Juridiques & Judiciaires', description: 'Magistrature, Greffe, Avocature, Notariat', color: '#4F46E5', displayOrder: 1 },
  { name: 'Administration Publique', description: 'ENA, Fonction Publique, EPPJEJ & EPP', color: '#0056B3', displayOrder: 2 },
  { name: 'Sécurité & Force Publique', description: 'Officiers et Sous-Officiers de Police, Gendarmerie', color: '#D97706', displayOrder: 3 },
  { name: 'Technologies & Métiers Numériques', description: 'Informatique, Cybersécurité, Réseaux', color: '#059669', displayOrder: 4 },
  { name: 'Santé & Paramédical', description: 'Concours INFAS, Médecine, Pharmacie', color: '#DC2626', displayOrder: 5 },
  { name: 'Éducation & Enseignement', description: 'CAFOP, ENS, Enseignement secondaire', color: '#7C3AED', displayOrder: 6 },
  { name: 'Finances & Gestion', description: 'Trésor, Impôts, Douanes, Comptabilité publique', color: '#0284C7', displayOrder: 7 },
];

/**
 * Initialise les catégories par défaut et synchronise les catégories existantes des formations
 */
export const seedAndSyncCategories = async () => {
  try {
    const existingCount = await prisma.courseCategory.count();
    if (existingCount === 0) {
      for (const cat of DEFAULT_PRESETS) {
        await prisma.courseCategory.upsert({
          where: { name: cat.name },
          update: {},
          create: cat,
        });
      }
    }

    // Récupérer les catégories distinctes des cours existants
    const courses = await prisma.course.findMany({ select: { category: true } });
    const uniqueCourseCategories = Array.from(
      new Set(courses.map(c => c.category?.trim()).filter(Boolean))
    ) as string[];

    for (const catName of uniqueCourseCategories) {
      const found = await prisma.courseCategory.findUnique({ where: { name: catName } });
      if (!found) {
        await prisma.courseCategory.create({
          data: {
            name: catName,
            description: `Catégorie issue du catalogue (${catName})`,
            color: '#0056B3',
            displayOrder: 10,
          },
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ Synchronisation des catégories de cours :', err);
  }
};

/**
 * Récupérer toutes les catégories
 */
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    await seedAndSyncCategories();
    const categories = await prisma.courseCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    // Compter le nombre de formations par catégorie
    const courses = await prisma.course.findMany({ select: { category: true } });
    const counts: Record<string, number> = {};
    for (const c of courses) {
      const cat = c.category?.trim() || 'Général';
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const result = categories.map(cat => ({
      ...cat,
      coursesCount: counts[cat.name] || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur getAllCategories :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
  }
};

/**
 * Créer une nouvelle catégorie
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, color, displayOrder } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Le nom de la catégorie est obligatoire' });
    }

    const trimmedName = name.trim();
    const existing = await prisma.courseCategory.findUnique({ where: { name: trimmedName } });
    if (existing) {
      return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà' });
    }

    const category = await prisma.courseCategory.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color?.trim() || '#0056B3',
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Erreur createCategory :', error);
    res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
  }
};

/**
 * Mettre à jour une catégorie
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, displayOrder } = req.body;

    const existing = await prisma.courseCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }

    const oldName = existing.name;
    const newName = name !== undefined ? name.trim() : oldName;

    // Si le nom change, vérifier les doublons et mettre à jour les cours associés
    if (newName !== oldName) {
      const duplicate = await prisma.courseCategory.findUnique({ where: { name: newName } });
      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({ message: 'Ce nom de catégorie est déjà utilisé' });
      }

      // Mettre à jour le champ category des formations existantes
      await prisma.course.updateMany({
        where: { category: oldName },
        data: { category: newName },
      });
    }

    const updated = await prisma.courseCategory.update({
      where: { id },
      data: {
        name: newName,
        description: description !== undefined ? description?.trim() || null : undefined,
        color: color !== undefined ? color?.trim() || '#0056B3' : undefined,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur updateCategory :', error);
    res.status(500).json({ message: 'Erreur lors de la modification de la catégorie' });
  }
};

/**
 * Supprimer une catégorie
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.courseCategory.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }

    // Basculer les cours associés vers "Général"
    await prisma.course.updateMany({
      where: { category: existing.name },
      data: { category: 'Général' },
    });

    await prisma.courseCategory.delete({ where: { id } });
    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteCategory :', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
  }
};
