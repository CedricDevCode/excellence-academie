const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initialCourses = [
  { title: "Magistrature", description: "Préparation au concours de la Magistrature", price: 150000 },
  { title: "ENA (Tous cycles)", description: "Préparation aux cycles Moyen, Moyen Supérieur et Supérieur de l'ENA", price: 100000 },
  { title: "Greffe", description: "Préparation au concours des greffiers", price: 120000 },
  { title: "Police", description: "Préparation aux concours de la Police Nationale", price: 120000 },
  { title: "Avocature & Notariat", description: "Préparation au CAPA et concours de notariat", price: 150000 },
  { title: "Fonction Publique", description: "Préparation aux concours administratifs de la fonction publique", price: 80000 },
  { title: "EPPJEJ & EPP", description: "Préparation aux concours du personnel pénitentiaire", price: 100000 },
  { title: "Informatique", description: "Formation pratique en informatique", price: 50000 },
];

async function main() {
  console.log("Seeding courses...");
  
  // Clear existing courses to avoid duplicates if running multiple times?
  // No, let's just insert if they don't exist based on title, but title is not unique in schema.
  // We can just add them.
  for (const c of initialCourses) {
    const existing = await prisma.course.findFirst({ where: { title: c.title } });
    if (!existing) {
      await prisma.course.create({ data: c });
      console.log(`Created course: ${c.title}`);
    } else {
      console.log(`Course already exists: ${c.title}`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
