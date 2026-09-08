export const PAYS = [
  "Côte d'Ivoire",
  "France",
  "Belgique",
  "Canada",
  "Sénégal",
  "Mali",
  "Burkina Faso",
  "Bénin",
  "Togo",
  "Cameroun",
  "Gabon",
  "Congo",
  "RDC",
  "Guinée",
  "Niger",
  "Autre",
];

export type Mode = 'presentiel' | 'en_ligne' | 'les_deux';

export const MODES: { id: Mode; name: string; desc: string }[] = [
  { id: 'presentiel', name: 'Présentiel', desc: 'Cours en centre de formation' },
  { id: 'en_ligne', name: 'En ligne', desc: 'Cours à distance (Google Meet)' },
  { id: 'les_deux', name: 'Présentiel + En ligne', desc: 'Accès aux deux formats' },
];

export const VILLES = [
  "Abidjan (Cocody Palmeraie)",
  "Bouaké",
  "Yamoussoukro",
  "Daloa",
  "Korhogo",
];

export function isDiaspora(pays: string): boolean {
  const p = pays.trim().toLowerCase();
  return p !== "côte d'ivoire" && p !== "cote d'ivoire" && p !== "";
}

export function isAbidjan(ville: string): boolean {
  if (!ville) return false;
  return ville.trim().toLowerCase().startsWith("abidjan");
}

export function calcRegistrationPrice(pays: string, mode: string, ville: string, coursParticuliers: boolean): number {
  if (coursParticuliers) return 200000;
  if (isDiaspora(pays)) return 100000;
  if (mode === 'en_ligne' || mode === 'les_deux') return 45000;
  if (isAbidjan(ville)) return 45000;
  return 35000;
}

export function calcMonthlyAmount(pays: string, mode: Mode, coursParticuliers: boolean, nbCourses: number): number {
  if (coursParticuliers) return 0;
  if (isDiaspora(pays)) return 35000;
  if (mode === 'en_ligne') return 25000;
  if (mode === 'les_deux') return 35000;
  const extraCourses = Math.max(0, nbCourses - 1);
  return 30000 + extraCourses * 10000;
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR');
}
