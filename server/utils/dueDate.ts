// Échéance mensuelle des mensualités : le 05 de chaque mois.
// Un paiement couvre le(s) mois à partir du mois en cours ; la prochaine
// échéance tombe le 5 du mois suivant le dernier mois couvert.
export const MONTHLY_DUE_DAY = 5;

export function computeNextDueDate(fromDate: Date, monthsCovered: number = 1): Date {
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  d.setMonth(d.getMonth() + Math.max(1, monthsCovered));
  return new Date(d.getFullYear(), d.getMonth(), MONTHLY_DUE_DAY, 0, 0, 0, 0);
}

/** Ramène une date d'échéance existante au 5 du même mois (normalisation). */
export function normalizeDueDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), MONTHLY_DUE_DAY, 0, 0, 0, 0);
}
