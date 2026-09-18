// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StatItemConfig {
  number: string;
  label: string;
  icon?: string; // 'magistrature' | 'ena' | 'cities' | 'online' | 'custom'
}

export interface SectionConfig {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
}

export interface HeroConfig {
  enabled?: boolean;
  badge: string;
  titleLine1: string;
  titleHighlight: string;
  titleLine2: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  /** Chiffre affiché dans la pastille "étudiants formés" */
  heroStudentsCount: string;
  /** Note affichée dans la pastille avis */
  heroRating: string;
  /** Label admis dans la floating card */
  heroAdmisLabel: string;
  /** Label concours dans la floating card */
  heroAdmisConcours: string;
  /** Pourcentage taux de réussite floating card */
  heroTauxReussite: string;
}

export interface HowStepConfig {
  title: string;
  desc: string;
}

export interface HowConfig {
  enabled?: boolean;
  title: string;
  subtitle: string;
  steps: HowStepConfig[];
}

export interface AtoutItemConfig {
  title: string;
  desc: string;
  color: string;
  icon: string; // 'trophy' | 'users' | 'mappin' | 'globe' | 'award' | 'shield'
}

export interface AtotsConfig {
  enabled?: boolean;
  title: string;
  subtitle: string;
  items: AtoutItemConfig[];
}

export interface TarifLigneConfig {
  label: string;
  value: string;
}

export interface TarifsConfig {
  enabled?: boolean;
  title: string;
  subtitle: string;
  inscription: TarifLigneConfig[];
  mensualites: TarifLigneConfig[];
  ctaLabel: string;
}

export interface CtaConfig {
  enabled?: boolean;
  title: string;
  subtitle: string;
  phone: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export interface CatalogueConfig {
  enabled?: boolean;
  title: string;
  subtitle: string;
  showPrices: boolean;
  ctaLabel: string;
}

export interface HomeConfig {
  hero: HeroConfig;
  stats: { enabled?: boolean; items: StatItemConfig[] };
  actualite: SectionConfig;
  how: HowConfig;
  atouts: AtotsConfig;
  admis: SectionConfig;
  formations: SectionConfig;
  tarifs: TarifsConfig;
  testimonials: SectionConfig;
  cta: CtaConfig;
  catalogue: CatalogueConfig;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SITE_CONFIG: HomeConfig = {
  hero: {
    enabled: true,
    badge: "L'école de référence en Côte d'Ivoire",
    titleLine1: "Votre réussite,",
    titleHighlight: "notre priorité",
    titleLine2: "absolue.",
    subtitle:
      "Préparez vos concours de la Magistrature, de l'ENA, du Greffe, du Notariat et des Agents pénitentiaires avec les meilleurs formateurs.",
    ctaPrimary: "Découvrir les formations",
    ctaSecondary: "S'inscrire en ligne",
    heroStudentsCount: "1000+",
    heroRating: "4.8/5",
    heroAdmisLabel: "13 Admis",
    heroAdmisConcours: "Magistrature 2026",
    heroTauxReussite: "65%",
  },
  stats: {
    enabled: true,
    items: [
      { number: "13+", label: "Admis Magistrature", icon: "magistrature" },
      { number: "8+",  label: "Admis ENA 2025",     icon: "ena" },
      { number: "7+",  label: "Villes couvertes",   icon: "cities" },
      { number: "100%", label: "En ligne & Présentiel", icon: "online" },
    ],
  },
  actualite: {
    enabled: true,
    title: "À la une",
    subtitle: "",
  },
  how: {
    enabled: true,
    title: "Comment ça marche ?",
    subtitle: "Un parcours simple et efficace pour décrocher votre concours.",
    steps: [
      { title: "Inscrivez-vous",   desc: "Créez votre compte en ligne en quelques clics et choisissez votre concours cible." },
      { title: "Suivez les cours", desc: "Accédez à nos formations en ligne ou en présentiel encadrées par des experts." },
      { title: "Pratiquez",        desc: "Exercices, examens blancs et suivi personnalisé pour maîtriser chaque matière." },
      { title: "Réussissez",       desc: "Intégrez la fonction publique grâce à notre méthodologie éprouvée." },
    ],
  },
  atouts: {
    enabled: true,
    title: "Pourquoi Excellence Académie ?",
    subtitle: "Les raisons qui font de nous la référence en préparation de concours.",
    items: [
      { icon: "trophy",  color: "from-yellow-500 to-orange-500",   title: "Taux de réussite élevé",  desc: "20% d'admis en Magistrature dès 2022, 15% en ENA 2023, et des dizaines d'admis chaque année." },
      { icon: "users",   color: "from-primary-500 to-primary-600", title: "Formateurs Experts",       desc: "Encadrement assuré par des magistrats, hauts fonctionnaires et juristes de haut niveau." },
      { icon: "mappin",  color: "from-green-500 to-emerald-500",   title: "Couverture Nationale",     desc: "Présent à Abidjan, Yamoussoukro, Bouaké, Daloa et Korhogo pour être au plus près de vous." },
      { icon: "globe",   color: "from-primary-600 to-accent-500",  title: "En ligne & Présentiel",    desc: "Suivez nos cours en présentiel ou 100% en ligne via Google Meet / Zoom, où que vous soyez." },
    ],
  },
  admis: {
    enabled: true,
    title: "Nos Lauréats & Admis aux Concours",
    subtitle:
      "Ils ont fait confiance à Excellence Académie et sont aujourd'hui Magistrats, Administrateurs civils et Greffiers en chef.",
  },
  formations: {
    enabled: true,
    title: "Nos Formations & Concours",
    subtitle: "Découvrez nos cycles préparatoires d'excellence encadrés par des magistrats et experts du domaine.",
  },
  tarifs: {
    enabled: true,
    title: "Tarifs & Inscription",
    subtitle: "Des tarifs accessibles pour une préparation d'excellence.",
    inscription: [
      { label: "Présentiel - Abidjan/Ligne", value: "45.000 F" },
      { label: "Présentiel - Intérieur",     value: "35.000 F" },
      { label: "Diaspora",                   value: "100.000 F" },
    ],
    mensualites: [
      { label: "Présentiel Abidjan", value: "30.000 F/mois" },
      { label: "Hybride Abidjan",    value: "35.000 F/mois" },
      { label: "En Ligne / Intérieur", value: "25.000 F/mois" },
    ],
    ctaLabel: "Rejoins-nous maintenant",
  },
  testimonials: {
    enabled: true,
    title: "Ils nous font confiance",
    subtitle: "Découvrez les retours d'expérience de nos étudiants qui ont préparé et réussi leurs concours.",
  },
  cta: {
    enabled: true,
    title: "Prêt à rejoindre l'excellence ?",
    subtitle:
      "Inscrivez-vous dès maintenant et commencez votre préparation avec les meilleurs formateurs de Côte d'Ivoire.",
    phone: "0747439443",
    ctaPrimary: "S'inscrire maintenant",
    ctaSecondary: "Appeler un conseiller",
  },
  catalogue: {
    enabled: true,
    title: "Catalogue des Formations",
    subtitle: "Toutes nos formations préparatoires aux concours de la fonction publique.",
    showPrices: true,
    ctaLabel: "S'inscrire à cette formation",
  },
};

// ─── Deep merge helper ─────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function mergeSiteConfig(partial: unknown): HomeConfig {
  const base = JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG)) as HomeConfig;

  if (!isPlainObject(partial)) return base;

  const src = partial as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof HomeConfig)[]) {
    const sectionSrc = (src as Record<string, unknown>)[key];
    if (!isPlainObject(sectionSrc)) continue;
    const target = base[key] as unknown as Record<string, unknown>;
    for (const k of Object.keys(target)) {
      const v = (sectionSrc as Record<string, unknown>)[k];
      if (v === undefined || v === null) continue;
      if (Array.isArray(target[k]) && Array.isArray(v)) {
        // Pour les tableaux (steps, items, inscription, mensualites…),
        // on remplace entièrement pour refléter l'intention admin.
        target[k] = v.map((item: unknown) =>
          isPlainObject(item) ? { ...item } : item
        );
      } else if (isPlainObject(target[k]) && isPlainObject(v)) {
        target[k] = { ...(target[k] as Record<string, unknown>), ...v };
      } else {
        target[k] = v;
      }
    }
  }
  return base;
}