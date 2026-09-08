const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const shopBanners = [
    {
      title: 'Pack Concours ENA',
      subtitle: 'Préparation Complète',
      description: 'Accès à tous les documents et ressources pour réussir le concours ENA',
      imageUrl: '/images/brochure-ena.svg',
      backgroundColor: 'from-[#FF6B00] to-[#e65c00]',
      badgeText: 'Essentiel',
      featured: false,
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Magistrature Guide',
      subtitle: 'Formation Magistrature',
      description: 'Tous les documents et conseils pour intégrer la Magistrature',
      imageUrl: '/images/brochure-magistrature.svg',
      backgroundColor: 'from-[#002855] to-[#004080]',
      badgeText: 'Populaire',
      featured: false,
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Pack Complet Justice',
      subtitle: 'Carrière Judiciaire',
      description: 'Documentation complète pour tous les concours de justice',
      imageUrl: '/images/brochure-justice.svg',
      backgroundColor: 'from-[#8B5CF6] to-[#6D28D9]',
      badgeText: 'Premium',
      featured: false,
      displayOrder: 3,
      isActive: true,
    },
  ];

  for (const banner of shopBanners) {
    const existing = await prisma.shopBanner.findFirst({
      where: { title: banner.title },
    });
    
    if (existing) {
      await prisma.shopBanner.update({ where: { id: existing.id }, data: banner });
      console.log(`Updated banner: ${banner.title}`);
    } else {
      await prisma.shopBanner.create({ data: banner });
      console.log(`Created banner: ${banner.title}`);
    }
  }

  console.log('Shop banners seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
