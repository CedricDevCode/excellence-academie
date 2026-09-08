import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all active banners
export const getActiveBanners = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const banners = await prisma.shopBanner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            imageUrl: true,
            type: true
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du chargement des bannières', error: error.message });
  }
};

// Get all banners (admin)
export const getAllBanners = async (req: Request, res: Response) => {
  try {
    const banners = await prisma.shopBanner.findMany({
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            imageUrl: true,
            type: true
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du chargement des bannières', error: error.message });
  }
};

// Get banner by ID
export const getBannerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const banner = await prisma.shopBanner.findUnique({
      where: { id },
      include: {
        product: true
      }
    });
    if (!banner) return res.status(404).json({ message: 'Bannière non trouvée' });
    res.json(banner);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};

// Create banner
export const createBanner = async (req: Request, res: Response) => {
  try {
    const { title, subtitle, description, imageUrl, backgroundColor, badgeText, featured, displayOrder, isActive, productId, startDate, endDate } = req.body;

    if (!title) return res.status(400).json({ message: 'Le titre est requis' });

    const banner = await prisma.shopBanner.create({
      data: {
        title,
        subtitle,
        description,
        imageUrl,
        backgroundColor: backgroundColor || 'from-[#FF6B00] to-[#e65c00]',
        badgeText: badgeText || 'Promotion',
        featured: featured || false,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
        productId: productId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        product: true
      }
    });

    res.status(201).json(banner);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
};

// Update banner
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, imageUrl, backgroundColor, badgeText, featured, displayOrder, isActive, productId, startDate, endDate } = req.body;

    const banner = await prisma.shopBanner.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        subtitle: subtitle !== undefined ? subtitle : undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        backgroundColor: backgroundColor !== undefined ? backgroundColor : undefined,
        badgeText: badgeText !== undefined ? badgeText : undefined,
        featured: featured !== undefined ? featured : undefined,
        displayOrder: displayOrder !== undefined ? displayOrder : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        productId: productId !== undefined ? productId : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined
      },
      include: {
        product: true
      }
    });

    res.json(banner);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
};

// Delete banner
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.shopBanner.delete({
      where: { id }
    });
    res.json({ message: 'Bannière supprimée avec succès' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
};
