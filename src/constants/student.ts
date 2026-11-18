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
  "Anyama",
  "Bingerville",
  "Grand-Bassam",
  "Bouaké",
  "Korhogo",
  "Daloa",
  "San-Pédro",
  "Yamoussoukro",
  "Divo",
  "Gagnoa",
  "Duekoué",
  "Man",
  "Soubré",
  "Abengourou",
  "Dania",
  "Séguéla",
  "Daoukro",
  "Aboisso",
  "Saïoua",
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
  if (coursParticuliers) return COURS_PARTICULIERS_FEE;
  if (isDiaspora(pays)) return 100000;
  if (isAbidjan(ville)) return 50000;
  return 40000;
}

export function calcMonthlyAmount(pays: string, mode: Mode, coursParticuliers: boolean, nbCourses: number): number {
  if (coursParticuliers) return 0;
  const extraCourses = Math.max(0, nbCourses - 1);
  if (isDiaspora(pays)) return 35000 + extraCourses * 10000;
  if (mode === 'en_ligne') return 25000 + extraCourses * 10000;
  if (mode === 'les_deux') return 35000 + extraCourses * 10000;
  return 30000 + extraCourses * 10000;
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR');
}

export const COURS_PARTICULIERS_FEE = 200000;
export const DEFAULT_REGISTRATION_FEE = 50000;
export const DEFAULT_REGISTRATION_FEE_INTERIEUR = 40000;
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
  // Tarification flat : même prix d'inscription pour 1, 2 ou 3 concours
  // (Abidjan 50 000 / Intérieur 40 000 / Diaspora 100 000 / Particulier 200 000)
  return calcRegistrationPrice(pays || '', 'presentiel', ville || '', false);
}

export function courseMonthlyFee(course?: FeeSource, pays?: string, mode?: Mode | string): number {
  // Mensualité flat selon le mode (+10 000 FCFA par concours supplémentaire)
  return calcMonthlyAmount(pays || '', (mode as Mode) || 'presentiel', false, 1);
}

export function calcRegistrationTotal(
  courses: FeeSource[],
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
  courses: FeeSource[],
  coursParticuliers: boolean,
  pays?: string,
  mode?: Mode | string
): number {
  if (coursParticuliers) return 0;
  const nb = Array.isArray(courses) ? courses.length : 0;
  const extra = Math.max(0, nb - 1);
  if (pays && isDiaspora(pays)) return 35000 + extra * 10000;
  if (mode === 'en_ligne') return 25000 + extra * 10000;
  if (mode === 'les_deux') return 35000 + extra * 10000;
  return 30000 + extra * 10000;
}
