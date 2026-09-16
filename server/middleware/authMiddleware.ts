import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// In-memory cache for user lookups (30s TTL)
const userCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

// Nettoyage périodique des entrées expirées (toutes les 60s)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache.entries()) {
    if (entry.expiresAt <= now) userCache.delete(key);
  }
}, 60_000);

// Éviter que l'intervalle empêche le processus de se terminer
if (cleanupInterval.unref) cleanupInterval.unref();

export function invalidateUserCache(userId?: string) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Authentification requise.' });
  }

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as { userId: string; role: string };

    // Check cache first
    const now = Date.now();
    const cached = userCache.get(decoded.userId);
    if (cached && cached.expiresAt > now) {
      req.user = cached.data;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        matricule: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou supprimé.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Compte désactivé. Contactez l'administration." });
    }

    // Store in cache
    userCache.set(decoded.userId, { data: user, expiresAt: now + CACHE_TTL_MS });

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Token invalide.' });
    }
    return res.status(500).json({ error: "Erreur d'authentification." });
  }
};

export const authMiddleware = authenticateToken;

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé : permissions insuffisantes.' });
    }
    next();
  };
};
