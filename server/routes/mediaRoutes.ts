import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * GET /media/product-images/:id — lecture des images produit depuis la base.
 *
 * Volontairement monté HORS /api : ni rate-limit global, ni garde 503 de
 * démarrage — une image déjà en cache côté navigateur doit rester servie même
 * pendant l'initialisation de la base.
 */
router.get('/product-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
      return res.status(404).json({ error: 'Image introuvable' });
    }

    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      return res.status(404).json({ error: 'Image introuvable' });
    }

    const buffer = Buffer.from(image.data);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.status(200).end(buffer);
  } catch (error) {
    console.error('Get product image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to load image' });
    }
  }
});

router.get('/blog-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
      return res.status(404).json({ error: 'Image introuvable' });
    }

    const image = await prisma.blogImage.findUnique({ where: { id } });
    if (!image) {
      return res.status(404).json({ error: 'Image introuvable' });
    }

    const buffer = Buffer.from(image.data);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.status(200).end(buffer);
  } catch (error) {
    console.error('Get blog image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to load image' });
    }
  }
});

export default router;
