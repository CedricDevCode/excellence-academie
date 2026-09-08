import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        title: 'Pack Concours ENA - Cycle Moyen',
        description: 'Pack complet de 5 fiches de révision pour le concours de l\'ENA Cycle Moyen. Couvre le droit administratif, l\'économie générale, les finances publiques, la culture générale et le management public.',
        price: 15000,
        originalPrice: 25000,
        type: 'PACK',
        imageUrl: '["/uploads/products/pack-ena.jpg"]',
        stock: 15,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'Fiche de Révision - Droit Constitutionnel',
        description: 'Fiche synthétique de 20 pages couvrant l\'intégralité du programme de droit constitutionnel pour les concours de la fonction publique.',
        price: 5000,
        originalPrice: 8000,
        type: 'DOCUMENT',
        imageUrl: '["/uploads/products/droit-consti.jpg"]',
        stock: 30,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'Annales Concours Magistrature 2024',
        description: 'Recueil des sujets d\'examen de la session 2024 de la Magistrature avec corrigés détaillés rédigés par des formateurs.',
        price: 12000,
        originalPrice: null,
        type: 'LIVRE',
        imageUrl: '["/uploads/products/annales-magistrature.jpg"]',
        stock: 8,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'Guide d\'Entretien Oral - ENA',
        description: 'Préparation complète à l\'épreuve orale d\'admission à l\'ENA : techniques de présentation, questions types, simulations d\'entretien.',
        price: 7000,
        originalPrice: 12000,
        type: 'DOCUMENT',
        imageUrl: '["/uploads/products/guide-oral-ena.jpg"]',
        stock: 20,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'T-Shirt Excellence Académie',
        description: 'T-shirt officiel Excellence Académie. Coton bio, design moderne avec le logo de l\'école. Disponible en plusieurs tailles.',
        price: 8500,
        originalPrice: 10000,
        type: 'AUTRE',
        imageUrl: '["/uploads/products/tshirt-exacademy.jpg"]',
        stock: 50,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'Pack Comptabilité Publique - Trésor',
        description: 'Pack de 4 fiches détaillées sur la comptabilité publique, le budget de l\'État et la gestion des finances publiques. Destiné au concours du Trésor.',
        price: 10000,
        originalPrice: 18000,
        type: 'PACK',
        imageUrl: '["/uploads/products/pack-compta.jpg"]',
        stock: 12,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'Code Civil Annoté - Édition Concours',
        description: 'Code civil annoté spécialement conçu pour les candidats aux concours de la Magistrature et du Greffe. Articles clés surlignés et commentés.',
        price: 20000,
        originalPrice: 30000,
        type: 'LIVRE',
        imageUrl: '["/uploads/products/code-civil.jpg"]',
        stock: 5,
        isActive: true,
      }
    }),
    prisma.product.create({
      data: {
        title: 'Méthodologie de la Dissertation Juridique',
        description: 'Guide pas-à-pas pour maîtriser la dissertation juridique : structure, argumentation, plans types, exemples commentés.',
        price: 4500,
        originalPrice: null,
        type: 'DOCUMENT',
        imageUrl: '["/uploads/products/methodo-dissertation.jpg"]',
        stock: 25,
        isActive: true,
      }
    }),
  ]);

  console.log(`${products.length} products created.`);

  // Create banners
  const banner1 = await prisma.shopBanner.create({
    data: {
      title: 'Préparez votre Concours',
      subtitle: 'Fiches, annales et packs de révision',
      description: 'Tout le nécessaire pour réussir les concours de la fonction publique ivoirienne. Livraison rapide partout en Côte d\'Ivoire.',
      backgroundColor: 'from-[#FF6B00] to-[#e65c00]',
      badgeText: 'Boutique Officielle',
      featured: true,
      displayOrder: 0,
      productId: products[0].id,
      isActive: true,
    }
  });

  const banner2 = await prisma.shopBanner.create({
    data: {
      title: 'Jusqu\'à -50% sur les Packs',
      subtitle: 'Offre Rentrée 2026',
      description: 'Profitez de réductions exceptionnelles sur nos packs de fiches de révision.',
      backgroundColor: 'from-[#002855] to-[#001a3a]',
      badgeText: 'Promo Rentrée',
      featured: false,
      displayOrder: 1,
      productId: products[5].id,
      isActive: true,
    }
  });

  console.log(`Banners created: ${banner1.title}, ${banner2.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
