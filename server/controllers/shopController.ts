import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { METHOD_TO_GP } from '../constants';
import { sendDirectEmail } from './notificationController';

// --- PRODUCTS ---

type NumberParse = { ok: true; value: number | null } | { ok: false; message: string };

/**
 * Parse numérique sûr : `null`, `undefined` ou `''` → null (valeur absente),
 * un nombre invalide → erreur 400 (au lieu d'un NaN qui casse Prisma en 500).
 */
function parseNumberField(value: unknown, label: string): NumberParse {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value === 'string' && value.trim() === '') return { ok: true, value: null };
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(n)) {
    return { ok: false, message: `Le champ « ${label} » n'est pas un nombre valide.` };
  }
  return { ok: true, value: n };
}

function parseStockField(value: unknown): NumberParse {
  const parsed = parseNumberField(value, 'stock');
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return { ok: true, value: null };
  if (parsed.value < 0) return { ok: false, message: 'Le stock ne peut pas être négatif.' };
  // stock: 0 est une valeur valide (= rupture de stock), null = illimité
  return { ok: true, value: Math.trunc(parsed.value) };
}

/** Extrait les ids d'images depuis `imageUrl` (JSON array ou URL unique). */
function extractImageIds(imageUrl: unknown): string[] {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) return [];
  const trimmed = imageUrl.trim();
  let entries: unknown[] = [trimmed];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      entries = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      entries = [trimmed];
    }
  }
  const ids = new Set<string>();
  for (const entry of entries) {
    if (typeof entry !== 'string') continue;
    const match = entry.match(/\/media\/product-images\/([A-Za-z0-9-]+)/);
    if (match) ids.add(match[1]);
  }
  return [...ids];
}

/** Rattache les ProductImage « en attente » référencées par imageUrl au produit. */
async function attachProductImages(productId: string, imageUrl: unknown): Promise<void> {
  const ids = extractImageIds(imageUrl);
  if (!ids.length) return;
  await prisma.productImage.updateMany({
    where: { id: { in: ids }, productId: null },
    data: { productId },
  });
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id }
    });
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { title, description, price, originalPrice, type, imageUrl, isActive, stock } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Le nom du produit est requis.' });
    }

    const priceParse = parseNumberField(price, 'prix');
    if (!priceParse.ok) return res.status(400).json({ error: priceParse.message });
    if (priceParse.value === null) return res.status(400).json({ error: 'Le prix est requis.' });
    if (priceParse.value < 0) return res.status(400).json({ error: 'Le prix ne peut pas être négatif.' });

    const originalPriceParse = parseNumberField(originalPrice, 'prix original');
    if (!originalPriceParse.ok) return res.status(400).json({ error: originalPriceParse.message });
    if (originalPriceParse.value !== null && originalPriceParse.value < 0) {
      return res.status(400).json({ error: 'Le prix original ne peut pas être négatif.' });
    }

    const stockParse = parseStockField(stock);
    if (!stockParse.ok) return res.status(400).json({ error: stockParse.message });

    const product = await prisma.product.create({
      data: {
        title: String(title).trim(),
        description: description ?? null,
        price: priceParse.value!,
        originalPrice: originalPriceParse.value,
        type: type || 'DOCUMENT',
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl : null,
        isActive: isActive ?? true,
        stock: stockParse.value
      }
    });

    await attachProductImages(product.id, imageUrl);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { title, description, price, originalPrice, type, imageUrl, isActive, stock } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' });

    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Le nom du produit est requis.' });
      }
      data.title = String(title).trim();
    }
    if (description !== undefined) data.description = description ?? null;

    if (price !== undefined) {
      const priceParse = parseNumberField(price, 'prix');
      if (!priceParse.ok) return res.status(400).json({ error: priceParse.message });
      if (priceParse.value === null) return res.status(400).json({ error: 'Le prix est requis.' });
      if (priceParse.value < 0) return res.status(400).json({ error: 'Le prix ne peut pas être négatif.' });
      data.price = priceParse.value;
    }

    if (originalPrice !== undefined) {
      const originalPriceParse = parseNumberField(originalPrice, 'prix original');
      if (!originalPriceParse.ok) return res.status(400).json({ error: originalPriceParse.message });
      if (originalPriceParse.value !== null && originalPriceParse.value < 0) {
        return res.status(400).json({ error: 'Le prix original ne peut pas être négatif.' });
      }
      data.originalPrice = originalPriceParse.value;
    }

    if (stock !== undefined) {
      const stockParse = parseStockField(stock);
      if (!stockParse.ok) return res.status(400).json({ error: stockParse.message });
      data.stock = stockParse.value;
    }

    if (type !== undefined) data.type = type;
    if (isActive !== undefined) data.isActive = isActive;
    if (imageUrl !== undefined) {
      data.imageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl : null;
    }

    const previousImageIds = imageUrl !== undefined
      ? (await prisma.productImage.findMany({ where: { productId: id }, select: { id: true } })).map(i => i.id)
      : [];

    const product = await prisma.product.update({
      where: { id },
      data
    });

    if (imageUrl !== undefined) {
      const newIds = extractImageIds(imageUrl);
      if (newIds.length) {
        // Rattache les nouvelles images (orphelines ou déjà à ce produit)
        await prisma.productImage.updateMany({
          where: { id: { in: newIds }, OR: [{ productId: null }, { productId: id }] },
          data: { productId: id }
        });
      }
      // Supprime les images retirées du formulaire (FK cascade si produit supprimé)
      const removedIds = previousImageIds.filter(pid => !newIds.includes(pid));
      if (removedIds.length) {
        await prisma.productImage.deleteMany({
          where: { id: { in: removedIds }, productId: id }
        });
      }
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' });

    // Suppression en cascade des images produit (doublon du ON DELETE CASCADE
    // de la FK, par sécurité si la table a été créée par le fallback runtime)
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    if (!file.buffer || file.buffer.length === 0) {
      return res.status(400).json({ error: 'Fichier vide' });
    }
    if (file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image trop volumineuse (5 Mo maximum).' });
    }

    // Purge des uploads orphelins (produit jamais créé / formulaire annulé) > 24 h
    await prisma.productImage.deleteMany({
      where: {
        productId: null,
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    const image = await prisma.productImage.create({
      data: {
        productId: null,
        // multer type le buffer en Buffer<ArrayBufferLike>, Prisma attend Uint8Array<ArrayBuffer>
        data: new Uint8Array(file.buffer),
        mimeType: file.mimetype,
        size: file.size
      }
    });

    res.json({ url: `/media/product-images/${image.id}` });
  } catch (error) {
    console.error('Upload product image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

// --- ORDERS ---

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.shopOrder.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getStudentOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const orders = await prisma.shopOrder.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student orders' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerName, customerEmail, customerPhone, city, adresse, whatsapp, paymentMethod, items, successUrl, errorUrl, userId } = req.body;
    
    if (!customerName || !customerEmail || !customerPhone || !city || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }
      // Vérifier le stock
      if (product.stock !== null && product.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuffisant pour "${product.title}" (${product.stock} disponibles)` });
      }
      totalAmount += product.price * item.quantity;
      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtTime: product.price
      });
    }

    const order = await prisma.shopOrder.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        city,
        adresse: adresse || null,
        whatsapp: whatsapp || null,
        totalAmount,
        paymentMethod,
        userId: userId || null,
        items: {
          create: orderItemsData
        }
      }
    });

    // Décrémenter le stock atomiquement pour chaque produit
    await prisma.$transaction(
      items.map((item: any) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    );

    // Cash on delivery — skip GeniusPay
    if (paymentMethod === 'ESPECES') {
      return res.status(200).json({
        success: true,
        checkoutUrl: null,
        reference: null,
        orderId: order.id,
        message: 'Commande enregistrée. Vous payerez à la livraison.',
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const geniusPayBody = {
      amount: totalAmount,
      description: `Boutique: Commande pour ${customerName}`,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      metadata: {
        action: 'shop_order',
        order_id: order.id
      },
      success_url: successUrl || `${baseUrl}/shop/payment/success`,
      error_url: errorUrl || `${baseUrl}/shop/payment/error`,
    };

    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      (geniusPayBody as Record<string, any>).payment_method = METHOD_TO_GP[paymentMethod];
    }

    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: 'POST',
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15000),
    });

    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: 'Le service de paiement est temporairement indisponible. Veuillez réessayer.',
      });
    }

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { geniusPayReference: gpData.reference }
    });

    res.status(200).json({
      success: true,
      checkoutUrl: paymentMethod && METHOD_TO_GP[paymentMethod]
        ? gpData.payment_url || gpData.checkout_url
        : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      orderId: order.id
    });
  } catch (error) {
    console.error('Create shop order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// --- REVIEWS ---

export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reviews = await prisma.review.findMany({
      where: { productId: id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
    res.json({ reviews, average: Math.round(avg * 10) / 10, count: reviews.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non connecté' });

    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La note doit être entre 1 et 5' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    const deliveredOrder = await prisma.shopOrder.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        items: { some: { productId: id } }
      }
    });
    if (!deliveredOrder) {
      return res.status(403).json({ error: 'Vous devez avoir reçu ce produit pour laisser un avis' });
    }

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId: id } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Vous avez déjà donné un avis sur ce produit' });
    }

    const review = await prisma.review.create({
      data: { rating, comment, userId, productId: id, orderId: deliveredOrder.id },
      include: { user: { select: { name: true } } }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'avis' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await prisma.shopOrder.update({
      where: { id },
      data: { status }
    });

    if (status === 'SHIPPED' || status === 'DELIVERED' || status === 'TRAITEE') {
      try {
        const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const mailOptions = {
          to: order.customerEmail,
          subject: `Mise à jour de votre commande Excellence Académie - ${status}`,
          html: `<p>Bonjour ${escapeHtml(order.customerName || '')},</p>
                 <p>Le statut de votre commande (Ref: ${escapeHtml(order.id)}) est maintenant : <strong>${escapeHtml(status)}</strong>.</p>
                 <p>Merci pour votre achat !</p>
                 <p>L'équipe Excellence Académie</p>`
        };
        await sendDirectEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
      } catch (err) {
        console.error('Failed to send order status email', err);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
