import jwt from 'jsonwebtoken';
import { Response } from 'express';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  }
  console.warn('⚠️  WARNING: JWT_SECRET is not set. Using insecure fallback — do NOT use in production!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_dev_only';

export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
}

export function setAuthCookie(res: Response, userId: string, role: string) {
  const token = signToken(userId, role);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });
}
