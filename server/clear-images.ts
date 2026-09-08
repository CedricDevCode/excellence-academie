import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const result = await prisma.product.updateMany({ data: { imageUrl: null } });
console.log(`Cleared imageUrl for ${result.count} products`);
await prisma.$disconnect();
