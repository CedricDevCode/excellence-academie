import jwt from 'jsonwebtoken';
import { Response } from 'express';

// La vérification de JWT_SECRET est effectuée au démarrage du serveur (server/index.ts).
// Si on arrive ici, JWT_SECRET est garanti d'être défini.
const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * Durée de validité des tokens JWT : 7 jours.
 * Les cookies HTTP-only expirent aussi après 7 jours.
 */
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function setAuthCookie(res: Response, userId: string, role: string): void {
  const token = signToken(userId, role);
  res.cookie('token', token, {
    httpOnly: true,                                         // Inaccessible via JavaScript côté client
    secure: process.env.NODE_ENV === 'production',         // HTTPS uniquement en production
    sameSite: 'strict',                                    // Protection CSRF stricte
    maxAge: TOKEN_TTL_SECONDS * 1000,                      // Durée en millisecondes
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}
