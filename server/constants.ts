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
