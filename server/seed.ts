import bcrypt from 'bcrypt';
import prisma from './utils/prisma';

async function main() {
  const password = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMe123!', 12);

  const users = [
    { email: 'admin@excellence.ci', name: 'Admin User', role: 'ADMIN' as any, password },
    { email: 'student@excellence.ci', name: 'Student User', role: 'STUDENT' as any, password },
    { email: 'teacher@excellence.ci', name: 'Teacher User', role: 'TEACHER' as any, password },
    { email: 'accountant@excellence.ci', name: 'Accountant User', role: 'ACCOUNTANT' as any, password },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log('Seed completed: users created.');

  const CI = "Cote d'Ivoire";

  const cities = [
    // Cote d'Ivoire — grandes villes + communes d'Abidjan
    { name: 'Abidjan', country: CI },
    { name: 'Bouake', country: CI },
    { name: 'Yamoussoukro', country: CI },
    { name: 'Daloa', country: CI },
    { name: 'Korhogo', country: CI },
    { name: 'Divo', country: CI },
    { name: 'Man', country: CI },
    { name: 'San Pedro', country: CI },
    { name: 'Gagnoa', country: CI },
    { name: 'Abengourou', country: CI },
    { name: 'Dimbokro', country: CI },
    { name: 'Bouna', country: CI },
    { name: 'Bingerville', country: CI },
    { name: 'Grand-Bassam', country: CI },
    { name: 'Cocody', country: CI },
    { name: 'Marcory', country: CI },
    { name: 'Plateau', country: CI },
    { name: 'Treichville', country: CI },
    { name: 'Abobo', country: CI },
    { name: 'Koumassi', country: CI },
    { name: 'Port-Bouet', country: CI },
    { name: 'Anyama', country: CI },
    { name: 'Adjamé', country: CI },
    { name: 'Attiekgongon', country: CI },
    { name: 'Beoumi', country: CI },
    { name: 'Bondoukou', country: CI },
    { name: 'Boundiali', country: CI },
    { name: 'Ferke', country: CI },
    { name: 'Guiglo', country: CI },
    { name: 'Issia', country: CI },
    { name: 'Jacqueville', country: CI },
    { name: 'Katiola', country: CI },
    { name: 'Lakota', country: CI },
    { name: 'Odienne', country: CI },
    { name: 'Oume', country: CI },
    { name: 'Seguela', country: CI },
    { name: 'Sinfra', country: CI },
    { name: 'Touba', country: CI },
    { name: 'Vavoua', country: CI },
    { name: 'Zuenoula', country: CI },
    // Afrique
    { name: 'Dakar', country: 'Senegal' },
    { name: 'Bamako', country: 'Mali' },
    { name: 'Ouagadougou', country: 'Burkina Faso' },
    { name: 'Cotonou', country: 'Benin' },
    { name: 'Lome', country: 'Togo' },
    { name: 'Accra', country: 'Ghana' },
    { name: 'Lagos', country: 'Nigeria' },
    { name: 'Yaounde', country: 'Cameroun' },
    { name: 'Libreville', country: 'Gabon' },
    // Europe
    { name: 'Paris', country: 'France' },
    { name: 'Lyon', country: 'France' },
    { name: 'Marseille', country: 'France' },
    { name: 'Bruxelles', country: 'Belgique' },
    { name: 'Geneve', country: 'Suisse' },
    { name: 'Berlin', country: 'Allemagne' },
    { name: 'Rome', country: 'Italie' },
    { name: 'Madrid', country: 'Espagne' },
    { name: 'Lisbonne', country: 'Portugal' },
    { name: 'Londres', country: 'Royaume-Uni' },
    { name: 'Amsterdam', country: 'Pays-Bas' },
    { name: 'Luxembourg', country: 'Luxembourg' },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { country: city.country },
      create: city,
    });
  }

  console.log('Seed completed: cities created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
