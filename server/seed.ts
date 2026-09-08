import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

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

  const cities = [
    // Afrique
    { name: 'Abidjan', country: "Côte d'Ivoire" },
    { name: 'Bouaké', country: "Côte d'Ivoire" },
    { name: 'Yamoussoukro', country: "Côte d'Ivoire" },
    { name: 'San Pedro', country: "Côte d'Ivoire" },
    { name: 'Dakar', country: 'Sénégal' },
    { name: 'Bamako', country: 'Mali' },
    { name: 'Ouagadougou', country: 'Burkina Faso' },
    { name: 'Cotonou', country: 'Bénin' },
    { name: 'Lomé', country: 'Togo' },
    { name: 'Accra', country: 'Ghana' },
    { name: 'Lagos', country: 'Nigeria' },
    { name: 'Yaoundé', country: 'Cameroun' },
    { name: 'Libreville', country: 'Gabon' },
    // Europe
    { name: 'Paris', country: 'France' },
    { name: 'Lyon', country: 'France' },
    { name: 'Marseille', country: 'France' },
    { name: 'Bruxelles', country: 'Belgique' },
    { name: 'Genève', country: 'Suisse' },
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
