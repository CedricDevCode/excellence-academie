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
  "Abidjan",
  "Bouaké",
  "Yamoussoukro",
  "Daloa",
  "Korhogo",
  "Divo",
  "Man",
];

export function isDiaspora(pays?: string): boolean {
  if (!pays) return false;
  const p = pays.trim().toLowerCase();
  return p !== "côte d'ivoire" && p !== "cote d'ivoire" && p !== "";
}

export function isAbidjan(ville?: string): boolean {
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

export const COURS_PARTICULIERS_FEE = 200000;
export const DEFAULT_REGISTRATION_FEE = 45000;
export const DEFAULT_REGISTRATION_FEE_INTERIEUR = 35000;
export const DEFAULT_REGISTRATION_FEE_DIASPORA = 100000;
export const DEFAULT_MONTHLY_FEE = 30000;

export interface FeeSource {
  price?: number;
  registrationFee?: number | null;
  registrationFeeInterieur?: number | null;
  registrationFeeDiaspora?: number | null;
  monthlyFee?: number | null;
  monthlyFeeInterieur?: number | null;
  monthlyFeeOnline?: number | null;
  monthlyFeeBoth?: number | null;
  monthlyFeeDiaspora?: number | null;
}

export function courseRegistrationFee(
  course?: FeeSource,
  pays?: string,
  ville?: string
): number {
  if (!course) return DEFAULT_REGISTRATION_FEE;

  // Diaspora (hors Côte d'Ivoire)
  if (pays && isDiaspora(pays)) {
    const diasFee = Number(course.registrationFeeDiaspora);
    if (diasFee > 0) return diasFee;
    return DEFAULT_REGISTRATION_FEE_DIASPORA;
  }

  // Intérieur CI (hors Abidjan)
  if (ville && !isAbidjan(ville)) {
    const intFee = Number(course.registrationFeeInterieur);
    if (intFee > 0) return intFee;
    return DEFAULT_REGISTRATION_FEE_INTERIEUR;
  }

  // Abidjan / défaut
  const reg = Number(course.registrationFee);
  if (reg && reg > 0) return reg;
  const price = Number(course.price);
  if (price && price > 0) return price;
  return DEFAULT_REGISTRATION_FEE;
}

export function courseMonthlyFee(course?: FeeSource, pays?: string, mode?: Mode | string): number {
  if (!course) return DEFAULT_MONTHLY_FEE;

  // Diaspora: toujours en ligne
  if (pays && isDiaspora(pays)) {
    const diasFee = Number(course.monthlyFeeDiaspora);
    if (diasFee > 0) return diasFee;
    return 35000;
  }

  // Mode-specific pricing (pour la CI)
  if (mode === 'en_ligne') {
    const onlineFee = Number(course.monthlyFeeOnline);
    if (onlineFee > 0) return onlineFee;
    return 25000;
  }

  if (mode === 'les_deux') {
    const bothFee = Number(course.monthlyFeeBoth);
    if (bothFee > 0) return bothFee;
    return 35000;
  }

  // Présentiel (défaut): utiliser monthlyFee ou monthlyFeeInterieur selon la zone
  const monthly = Number(course.monthlyFee);
  if (monthly && monthly > 0) return monthly;
  return DEFAULT_MONTHLY_FEE;
}

export function calcRegistrationTotal(
  courses: FeeSource[],
  coursParticuliers: boolean,
  pays?: string,
  ville?: string
): number {
  if (coursParticuliers) return COURS_PARTICULIERS_FEE;
  if (!Array.isArray(courses) || courses.length === 0) {
    if (pays && isDiaspora(pays)) return DEFAULT_REGISTRATION_FEE_DIASPORA;
    if (ville && !isAbidjan(ville)) return DEFAULT_REGISTRATION_FEE_INTERIEUR;
    return DEFAULT_REGISTRATION_FEE;
  }
  return courses.reduce((sum, c) => sum + courseRegistrationFee(c, pays, ville), 0);
}

export function calcMonthlyTotal(
  courses: FeeSource[],
  coursParticuliers: boolean,
  pays?: string,
  mode?: Mode | string
): number {
  if (coursParticuliers) return 0;
  if (!Array.isArray(courses) || courses.length === 0) return DEFAULT_MONTHLY_FEE;
  return courses.reduce((sum, c) => sum + courseMonthlyFee(c, pays, mode), 0);
}
