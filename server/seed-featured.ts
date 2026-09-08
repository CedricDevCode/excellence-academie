import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Remove old banners
  await prisma.shopBanner.deleteMany({});
  console.log('Old banners removed');

  // Create 3 featured products with actual image URLs
  const products = [
    {
      title: 'Pack Concours ENA - Cycle Moyen',
      description: 'Pack complet de 5 fiches de révision illustrées pour le concours de l\'ENA Cycle Moyen. Couvre le droit administratif, l\'économie générale, les finances publiques, la culture générale et le management public. Format PDF téléchargeable.',
      price: 15000,
      originalPrice: 25000,
      type: 'PACK',
      imageUrl: '["/uploads/products/pack-ena.svg"]',
      stock: 15,
    },
    {
      title: 'Code Civil Annoté - Édition Concours',
      description: 'Code civil annoté spécialement conçu pour les candidats aux concours de la Magistrature et du Greffe. Articles clés surlignés, commentaires d\'experts et renvois jurisprudentiels.',
      price: 20000,
      originalPrice: 30000,
      type: 'LIVRE',
      imageUrl: '["/uploads/products/code-civil.svg"]',
      stock: 8,
    },
    {
      title: 'Annales Concours Magistrature 2024',
      description: 'Recueil officiel des sujets d\'examen de la session 2024 avec corrigés détaillés rédigés par des formateurs. 5 épreuves complètes avec barèmes et conseils méthodologiques.',
      price: 12000,
      originalPrice: 18000,
      type: 'DOCUMENT',
      imageUrl: '["/uploads/products/annales.svg"]',
      stock: 20,
    },
  ];

  const created = [];
  for (const p of products) {
    const product = await prisma.product.create({ data: p });
    created.push(product);
    console.log(`Created: ${product.title}`);
  }

  // Create 3 banners linked to each product (Jumia-style)
  const banners = [
    {
      title: 'Pack Concours ENA',
      subtitle: 'Fiches de révision complètes',
      description: '5 fiches illustrées pour réussir l\'ENA Cycle Moyen. Économisez 40% sur le pack complet.',
      backgroundColor: 'from-[#FF6B00] to-[#e65c00]',
      badgeText: 'Meilleure vente',
      featured: true,
      displayOrder: 0,
      productId: created[0].id,
    },
    {
      title: 'Code Civil Annoté',
      subtitle: 'L\'outil indispensable du juriste',
      description: 'Édition spéciale concours avec annotations et commentaires. Préparez efficacement la Magistrature et le Greffe.',
      backgroundColor: 'from-[#002855] to-[#001a3a]',
      badgeText: 'Nouveauté',
      featured: false,
      displayOrder: 1,
      productId: created[1].id,
    },
    {
      title: 'Annales Magistrature 2024',
      subtitle: 'Sujets + Corrigés détaillés',
      description: 'Entraînez-vous avec les vrais sujets de la session 2024. Corrigés par nos formateurs. Jusqu\'à -33%.',
      backgroundColor: 'from-[#1a8a3a] to-[#0d6b2e]',
      badgeText: 'Promo -33%',
      featured: false,
      displayOrder: 2,
      productId: created[2].id,
    },
  ];

  for (const b of banners) {
    const banner = await prisma.shopBanner.create({ data: b });
    console.log(`Banner: ${banner.title}`);
  }

  console.log(`\n✓ ${created.length} produits vedettes créés avec leurs bannières`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
