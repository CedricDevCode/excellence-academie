import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { GENIUSPAY_API_BASE, geniusPayHeaders, handleGeniusPayResponse } from '../utils/geniuspay';
import { METHOD_TO_GP } from '../constants';
import { sendDirectEmail } from './notificationController';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- PRODUCTS ---

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
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice !== undefined ? parseFloat(originalPrice) : null,
        type,
        imageUrl,
        isActive: isActive ?? true,
        stock: stock ? parseInt(stock) : null
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, price, originalPrice, type, imageUrl, isActive, stock } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        title,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        originalPrice: originalPrice !== undefined ? parseFloat(originalPrice) : undefined,
        type,
        imageUrl,
        isActive,
        stock: stock !== undefined ? (stock === null ? null : parseInt(stock)) : undefined
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    const url = `/uploads/products/${file.filename}`;
    res.json({ url });
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
        const mailOptions = {
          to: order.customerEmail,
          subject: `Mise à jour de votre commande Excellence Académie - ${status}`,
          html: `<p>Bonjour ${order.customerName},</p>
                 <p>Le statut de votre commande (Ref: ${order.id}) est maintenant : <strong>${status}</strong>.</p>
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
