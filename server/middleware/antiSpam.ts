import type { NextFunction, Request, Response } from 'express';

/**
 * Protection anti-spam légère pour les formulaires publics :
 * - honeypot : un champ caché (_hp / website / company) doit rester vide ;
 * - time-trap : le formulaire doit avoir été ouvert depuis au moins 2 secondes.
 *
 * Aucune donnée personnelle n'est stockée. Compatible avec les validateurs Zod
 * (les champs techniques sont ignorés/stripés par les schémas).
 */
const MIN_FORM_TIME_MS = 2000;

export function antiSpam(req: Request, res: Response, next: NextFunction) {
  const body: any = req.body || {};

  const honeypot = body._hp ?? body.website ?? body.company;
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return res.status(400).json({ error: 'Requête invalide.' });
  }

  const startedAt = Number(body._ts);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const elapsed = Date.now() - startedAt;
    // Horodatage dans le futur ou soumission instantanée = robot probable.
    if (elapsed < 0 || elapsed < MIN_FORM_TIME_MS) {
      return res.status(429).json({
        error: 'Veuillez patienter quelques secondes avant de soumettre le formulaire.',
      });
    }
  }

  next();
}
