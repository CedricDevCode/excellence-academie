import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEncoding() {
  const banner = await prisma.shopBanner.findFirst({
    where: { title: 'Pack Complet Justice' }
  });
  
  if (!banner) {
    console.log('Banner not found');
    await prisma.$disconnect();
    return;
  }
  
  await prisma.shopBanner.update({
    where: { id: banner.id },
    data: { subtitle: 'Carrière Judiciaire' }
  });
  console.log('Fixed encoding issue - subtitle updated to: Carrière Judiciaire');
  await prisma.$disconnect();
}

fixEncoding().catch(e => { 
  console.error(e); 
  process.exit(1); 
});
