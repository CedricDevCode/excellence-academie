import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_FORMATIONS = [
  {
    title: 'Magistrature',
    category: 'Concours Juridiques & Judiciaires',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Préparation intensive d\'excellence au concours direct et professionnel de la Magistrature'
  },
  {
    title: 'Greffe',
    category: 'Concours Juridiques & Judiciaires',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Préparation complète aux concours des greffiers et administrateurs des greffes'
  },
  {
    title: 'Avocature & Notariat',
    category: 'Concours Juridiques & Judiciaires',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Préparation au certificat d\'aptitude (CAPA) et concours de notariat'
  },
  {
    title: 'ENA (Tous cycles)',
    category: 'Administration Publique',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Préparation aux cycles Moyen, Moyen Supérieur et Supérieur de l\'ENA'
  },
  {
    title: 'Fonction Publique',
    category: 'Administration Publique',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Concours directs et professionnels de la Fonction Publique'
  },
  {
    title: 'EPPJEJ & EPP',
    category: 'Administration Publique',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Protection judiciaire de l\'enfance, de la jeunesse et éducateurs'
  },
  {
    title: 'Police',
    category: 'Sécurité & Force Publique',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 30000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Préparation aux concours des Commissaires, Officiers et Sous-Officiers de Police'
  },
  {
    title: 'Informatique',
    category: 'Technologies & Métiers Numériques',
    price: 35000,
    registrationFee: 35000,
    monthlyFee: 25000,
    hasPresentiel: true,
    hasOnline: true,
    description: 'Bureautique avancée, développement web, outils numériques et cybersécurité'
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
          registrationFee: f.registrationFee,
          monthlyFee: f.monthlyFee,
          hasPresentiel: f.hasPresentiel,
          hasOnline: f.hasOnline,
          description: f.description,
        }
      });
      console.log(`[Formations] Mis à jour: ${f.title} (${f.category} - Inscription: ${f.registrationFee} F / Mois: ${f.monthlyFee} F)`);
    } else {
      await prisma.course.create({
        data: f
      });
      console.log(`[Formations] Créé: ${f.title} (${f.category} - Inscription: ${f.registrationFee} F / Mois: ${f.monthlyFee} F)`);
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
