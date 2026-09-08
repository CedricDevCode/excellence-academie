import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_FORMATIONS = [
  {
    title: 'Magistrature',
    category: 'Concours Juridiques & Judiciaires',
    price: 150000,
    description: 'Préparation intensive au concours d\'accès à la Magistrature'
  },
  {
    title: 'Greffe',
    category: 'Concours Juridiques & Judiciaires',
    price: 120000,
    description: 'Préparation complète au concours des greffiers et administrateurs des greffes'
  },
  {
    title: 'Avocature & Notariat',
    category: 'Concours Juridiques & Judiciaires',
    price: 150000,
    description: 'Préparation au CAPA, examen d\'avocat et concours de notariat'
  },
  {
    title: 'ENA (Tous cycles)',
    category: 'Administration Publique',
    price: 100000,
    description: 'Préparation aux cycles Moyen, Moyen Supérieur et Supérieur de l\'ENA'
  },
  {
    title: 'Fonction Publique',
    category: 'Administration Publique',
    price: 80000,
    description: 'Concours directs et professionnels de la Fonction Publique'
  },
  {
    title: 'EPPJEJ & EPP',
    category: 'Administration Publique',
    price: 100000,
    description: 'Préparation aux concours de la protection judiciaire de l\'enfance et de la jeunesse'
  },
  {
    title: 'Police',
    category: 'Sécurité & Force Publique',
    price: 120000,
    description: 'Préparation aux concours des Officiers et Sous-Officiers de Police'
  },
  {
    title: 'Informatique',
    category: 'Technologies & Métiers Numériques',
    price: 50000,
    description: 'Formation pratique aux outils numériques, bureautique et informatique'
  },
];

export async function seedFormations() {
  for (const f of DEFAULT_FORMATIONS) {
    const existing = await prisma.course.findFirst({ where: { title: f.title } });
    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          category: f.category,
          price: f.price,
          description: f.description,
        }
      });
      console.log(`[Formations] Mis à jour: ${f.title} (${f.category} - ${f.price} FCFA)`);
    } else {
      await prisma.course.create({
        data: f
      });
      console.log(`[Formations] Créé: ${f.title} (${f.category} - ${f.price} FCFA)`);
    }
  }
}

if (process.argv[1]?.includes('seed-courses')) {
  seedFormations()
    .then(() => {
      console.log('✅ Seeding des formations terminé');
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error(err);
      return prisma.$disconnect();
    });
}
