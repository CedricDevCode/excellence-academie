export const COUNTRY_TO_ISO2: Record<string, string> = {
  "Côte d'Ivoire": "CI", "France": "FR", "Belgique": "BE", "Canada": "CA",
  "Sénégal": "SN", "Mali": "ML", "Burkina Faso": "BF", "Bénin": "BJ",
  "Togo": "TG", "Cameroun": "CM", "Gabon": "GA", "Congo": "CG",
  "RDC": "CD", "Guinée": "GN", "Niger": "NE",
};

export function isDiaspora(pays?: string): boolean {
  if (!pays) return false;
  const p = pays.trim().toLowerCase();
  return p !== "côte d'ivoire" && p !== "cote d'ivoire";
}

export function isAbidjan(ville?: string): boolean {
  if (!ville) return false;
  return ville.trim().toLowerCase().startsWith("abidjan");
}

/** Montant de base du supplément de mensualité lié à plusieurs concours (10 000 FCFA). */
export const ADDITIONAL_COURSE_MONTHLY_FEE = 10000;

export function calcRegistrationPrice(pays: string, mode: string, ville: string, coursParticuliers: boolean): number {
  if (coursParticuliers) return COURS_PARTICULIERS_FEE;
  if (isDiaspora(pays)) return DEFAULT_REGISTRATION_FEE_DIASPORA;
  if (isAbidjan(ville)) return DEFAULT_REGISTRATION_FEE;
  return DEFAULT_REGISTRATION_FEE_INTERIEUR;
}

export function calcMonthlyAmount(pays: string, mode: string, coursParticuliers: boolean, nbCourses: number): number {
  if (coursParticuliers) return 0;
  const supplement = (Number(nbCourses) || 0) > 1 ? ADDITIONAL_COURSE_MONTHLY_FEE : 0;
  if (isDiaspora(pays)) return 35000 + supplement;
  if (mode === 'en_ligne') return 25000 + supplement;
  if (mode === 'les_deux') return 35000 + supplement;
  return DEFAULT_MONTHLY_FEE + supplement;
}

export const COURS_PARTICULIERS_FEE = 200000;
export const DEFAULT_REGISTRATION_FEE = 50000;  // Abidjan
export const DEFAULT_REGISTRATION_FEE_INTERIEUR = 40000; // Intérieur CI
export const DEFAULT_REGISTRATION_FEE_DIASPORA = 100000; // Diaspora
export const DEFAULT_MONTHLY_FEE = 30000;

interface CourseFees {
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

/** Frais d'inscription : un seul montant, quel que soit le nombre de concours. */
export function courseRegistrationFee(
  course?: CourseFees,
  pays?: string,
  ville?: string
): number {
  return calcRegistrationPrice(pays || '', 'presentiel', ville || '', false);
}

/** Mensualité de base d'un concours (le supplément éventuel est géré par calcMonthlyTotal). */
export function courseMonthlyFee(
  course?: CourseFees,
  pays?: string,
  mode?: string
): number {
  return calcMonthlyAmount(pays || '', mode || 'presentiel', false, 1);
}

export function calcRegistrationTotal(
  courses: CourseFees[],
  coursParticuliers: boolean,
  pays?: string,
  ville?: string
): number {
  if (coursParticuliers) return COURS_PARTICULIERS_FEE;
  if (pays && isDiaspora(pays)) return DEFAULT_REGISTRATION_FEE_DIASPORA;
  if (ville && !isAbidjan(ville)) return DEFAULT_REGISTRATION_FEE_INTERIEUR;
  return DEFAULT_REGISTRATION_FEE;
}

export function calcMonthlyTotal(
  courses: CourseFees[],
  coursParticuliers: boolean,
  pays?: string,
  mode?: string
): number {
  const nb = Array.isArray(courses) ? courses.length : 0;
  return calcMonthlyAmount(pays || '', mode || 'presentiel', coursParticuliers, nb);
}

/**
 * Répartit la mensualité totale entre les abonnements d'un même étudiant.
 * Le concours principal porte le montant total ; les concours supplémentaires sont
 * inclus dans ce montant (0) afin de ne pas facturer la mensualité plusieurs fois.
 */
export function monthlyAmountForCourse(totalMonthly: number, index: number): number {
  return index === 0 ? totalMonthly : 0;
}

export const METHOD_TO_GP: Record<string, string> = {
  wave: 'wave',
  orange: 'orange_money',
  mtn: 'mtn_money',
  moov: 'moov_money',
  card: 'card',
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money',
  MTN_MOMO: 'mtn_money',
  MOOV: 'moov_money',
  CARTE: 'card',
};
