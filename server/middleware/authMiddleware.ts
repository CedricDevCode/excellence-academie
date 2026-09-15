import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// Extension du type Request d'Express pour inclure l'utilisateur authentifié
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware d'authentification JWT.
 * Vérifie le cookie `token`, décode le JWT et attache l'utilisateur à la requête.
 * Le JWT_SECRET est garanti non-nul par la vérification au démarrage (server/index.ts).
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Authentification requise.' });
  }

  try {
    // JWT_SECRET est vérifié non-nul au démarrage — pas de fallback ici
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as { userId: string; role: string };

    // Vérifier que l'utilisateur existe toujours en base
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
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administration.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Token invalide.' });
    }
    return res.status(500).json({ error: 'Erreur d\'authentification.' });
  }
};

export const authMiddleware = authenticateToken;

/**
 * Middleware de contrôle des rôles.
 * À utiliser après `authenticateToken`.
 */
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
