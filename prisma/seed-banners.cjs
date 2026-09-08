const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const banners = [
    {
      title: 'Banner 1',
      subtitle: 'Nouveau',
      description: 'Découvrez nos offres du moment',
      imageUrl: '/images/image1.jpeg',
      featured: true,
      isActive: true,
      displayOrder: 1,
    },
    {
      title: 'Banner 2',
      subtitle: 'À la une',
      description: 'Nos best-sellers sélectionnés pour vous',
      imageUrl: '/images/image2.jpeg',
      featured: true,
      isActive: true,
      displayOrder: 2,
    },
    {
      title: 'Banner 3',
      subtitle: 'Promotion',
      description: 'Profitez de nos meilleures réductions',
      imageUrl: '/images/image3.jpeg',
      featured: true,
      isActive: true,
      displayOrder: 3,
    },
  ];

  for (const banner of banners) {
    const existing = await prisma.shopBanner.findFirst({ where: { imageUrl: banner.imageUrl } });
    if (existing) {
      await prisma.shopBanner.update({ where: { id: existing.id }, data: banner });
      console.log(`Updated banner ${banner.imageUrl}`);
    } else {
      await prisma.shopBanner.create({ data: banner });
      console.log(`Created banner ${banner.imageUrl}`);
    }
  }

  console.log('Seed banners finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
