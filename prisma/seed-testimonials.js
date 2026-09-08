import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  await p.testimonial.createMany({
    data: [
      {
        name: 'Kouame Yao Serge',
        course: 'Magistrature (Admis 2024)',
        message: 'J\'ai integre Excellence Academie apres deux echecs dans d\'autres centres. Grace a la rigueur des formateurs et aux examens blancs reguliers, j\'ai ete admis des ma premiere tentative ici. Je recommande vivement !',
        rating: 5
      },
      {
        name: 'Aminata Diallo',
        course: 'ENA Cycle Superieur (Admise 2025)',
        message: 'Le format hybride m\'a permis de suivre les cours depuis Bouake tout en travaillant. Les supports sont complets et les enseignants tres disponibles. Merci Excellence Academie !',
        rating: 5
      }
    ]
  });
  console.log('Testimonials seeded successfully');
  await p.$disconnect();
}

main();
