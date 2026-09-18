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

export function calcRegistrationPrice(pays: string, mode: string, ville: string, coursParticuliers: boolean): number {
  if (coursParticuliers) return 200000;
  if (isDiaspora(pays)) return 100000;
  if (mode === 'en_ligne' || mode === 'les_deux') return 45000;
  if (isAbidjan(ville)) return 45000;
  return 35000;
}

export function calcMonthlyAmount(pays: string, mode: string, coursParticuliers: boolean, nbCourses: number): number {
  if (coursParticuliers) return 0;
  if (isDiaspora(pays)) return 35000;
  let base: number;
  if (mode === 'en_ligne') {
    base = 25000;
  } else if (mode === 'les_deux') {
    base = 35000;
  } else {
    base = 30000;
  }
  const extraCourses = Math.max(0, nbCourses - 1);
  return base + extraCourses * 10000;
}

export const COURS_PARTICULIERS_FEE = 200000;
export const DEFAULT_REGISTRATION_FEE = 45000;  // Abidjan/en ligne
export const DEFAULT_REGISTRATION_FEE_INTERIEUR = 35000; // Intérieur CI
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

/** Retourne le frais d'inscription pour un cours selon la zone */
export function courseRegistrationFee(
  course?: CourseFees,
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

  // Abidjan / en ligne (tarif standard)
  const reg = Number(course.registrationFee);
  if (reg > 0) return reg;
  const price = Number(course.price);
  if (price > 0) return price;
  return DEFAULT_REGISTRATION_FEE;
}

/** Retourne la mensualité pour un cours selon la zone ET le mode */
export function courseMonthlyFee(
  course?: CourseFees,
  pays?: string,
  mode?: string
): number {
  if (!course) return DEFAULT_MONTHLY_FEE;

  // Diaspora: toujours en ligne
  if (pays && isDiaspora(pays)) {
    const diasFee = Number(course.monthlyFeeDiaspora);
    if (diasFee > 0) return diasFee;
    return 35000; // défaut diaspora
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

  // Présentiel (défaut)
  const monthly = Number(course.monthlyFee);
  if (monthly > 0) return monthly;
  return DEFAULT_MONTHLY_FEE;
}

export function calcRegistrationTotal(
  courses: CourseFees[],
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
  courses: CourseFees[],
  coursParticuliers: boolean,
  pays?: string,
  mode?: string
): number {
  if (coursParticuliers) return 0;
  if (!Array.isArray(courses) || courses.length === 0) return DEFAULT_MONTHLY_FEE;
  return courses.reduce((sum, c) => sum + courseMonthlyFee(c, pays, mode), 0);
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
