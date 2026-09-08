import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@excellence.ci' } });
  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@excellence.ci' } });
  const student = await prisma.user.findUnique({ where: { email: 'student@excellence.ci' } });
  if (!admin || !teacher || !student) { console.error('Run server/seed.ts first'); process.exit(1); }

  const courses = await prisma.course.findMany();
  const course = courses[0];

  // Tags
  const tagNames = ['maths', 'physique', 'français', 'examen', 'cours', 'exercice'];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const t = await prisma.blogTag.upsert({ where: { name }, update: {}, create: { name } });
    tags[name] = t.id;
  }

  const posts = [
    {
      slug: 'cours-de-mathematiques-les-fonctions',
      title: 'Cours de Mathématiques — Les Fonctions',
      excerpt: 'Comprendre les bases des fonctions mathématiques pour réussir vos examens.',
      content: `<h2>Introduction aux fonctions</h2><p>Une fonction f est une relation qui associe à chaque élément x un unique élément y.</p><h3>Notation</h3><p>On note f(x) = y, où x est la variable et y l'image.</p><h3>Exemple</h3><p>Soit f(x) = 2x + 3. Pour x = 1, f(1) = 5.</p><p>Les fonctions sont essentielles pour comprendre l'analyse mathématique.</p>`,
      published: true,
      authorId: teacher!.id,
      courseId: course?.id,
      tags: ['maths', 'cours'],
    },
    {
      slug: 'exercice-physique-mouvement-rectiligne',
      title: 'Exercice de Physique — Mouvement Rectiligne',
      excerpt: 'Un exercice corrigé sur le mouvement rectiligne uniforme et accéléré.',
      content: `<h2>Énoncé</h2><p>Un véhicule parcourt une distance de 120 km à vitesse constante de 60 km/h.</p><h3>Questions</h3><ol><li>Calculer le temps nécessaire.</li><li>Si la vitesse double, quel est le nouveau temps ?</li></ol><h3>Correction</h3><p>t = d/v = 120/60 = 2 heures.</p>`,
      published: true,
      authorId: teacher!.id,
      courseId: course?.id,
      tags: ['physique', 'exercice'],
    },
    {
      slug: 'preparation-examen-blanc',
      title: 'Préparation à l\'Examen Blanc — Conseils',
      excerpt: 'Nos conseils pour bien préparer votre examen blanc et réussir.',
      content: `<h2>Comment se préparer ?</h2><p>Voici quelques conseils pour réussir votre examen blanc :</p><ul><li>Révisez régulièrement</li><li>Faites des exercices</li><li>Dormez suffisamment</li><li>Arrivez à l'heure</li></ul><p>L'examen blanc est une étape cruciale dans votre préparation.</p>`,
      published: true,
      authorId: admin!.id,
      tags: ['examen', 'français'],
    },
  ];

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        published: post.published,
        authorId: post.authorId,
        courseId: post.courseId,
        tags: {
          create: post.tags.map(name => ({ tagId: tags[name]! })),
        },
      },
    });
  }
  console.log('Blog seed completed:', posts.length, 'articles');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
