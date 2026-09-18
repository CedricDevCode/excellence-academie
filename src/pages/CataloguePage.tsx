import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Gavel,
  Building2,
  Scale,
  Shield,
  BookOpen,
  Award,
  ArrowRight,
  Clock,
  Globe,
  MapPin,
  Search,
  Filter,
  Loader2,
  GraduationCap,
  Sparkles,
  Star,
  CheckCircle2,
} from "lucide-react";
import { fetchCourses, fetchSiteConfig, fetchCourseCategories } from "../utils/api";
import { mergeSiteConfig, DEFAULT_SITE_CONFIG } from "../constants/siteConfig";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Card, Container } from "../components/ui";

/* ─── Animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

/* ─── Icon mapping ─── */
function getCourseIcon(title: string = "", category: string = "") {
  const t = (title + " " + category).toLowerCase();
  if (t.includes("magistr") || t.includes("greff")) return <Gavel size={24} />;
  if (t.includes("ena") || t.includes("fonction") || t.includes("epp")) return <Building2 size={24} />;
  if (t.includes("police") || t.includes("sécurité") || t.includes("securite") || t.includes("pénitent"))
    return <Shield size={24} />;
  if (t.includes("avocat") || t.includes("notari") || t.includes("droit")) return <Scale size={24} />;
  if (t.includes("info") || t.includes("numériqu") || t.includes("techno")) return <Award size={24} />;
  if (t.includes("gradu") || t.includes("licence") || t.includes("master")) return <GraduationCap size={24} />;
  return <BookOpen size={24} />;
}

function getCourseColor(index: number): string {
  const colors = [
    "from-orange-500/15 to-orange-600/10 border-orange-200",
    "from-amber-500/15 to-amber-600/10 border-amber-200",
    "from-blue-500/15 to-blue-600/10 border-blue-200",
    "from-green-500/15 to-green-600/10 border-green-200",
    "from-purple-500/15 to-purple-600/10 border-purple-200",
    "from-red-500/15 to-red-600/10 border-red-200",
    "from-teal-500/15 to-teal-600/10 border-teal-200",
    "from-indigo-500/15 to-indigo-600/10 border-indigo-200",
  ];
  return colors[index % colors.length];
}

function getCourseIconColor(index: number): string {
  const colors = [
    "bg-orange-100 text-orange-600",
    "bg-amber-100 text-amber-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-red-100 text-red-600",
    "bg-teal-100 text-teal-600",
    "bg-indigo-100 text-indigo-600",
  ];
  return colors[index % colors.length];
}

/* ─── Default courses (fallback) ─── */
const DEFAULT_COURSES = [
  {
    id: "1",
    title: "Magistrature",
    category: "Concours Juridiques",
    monthlyFee: 30000,
    registrationFee: 45000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Préparez le concours d'entrée à l'École Nationale de la Magistrature. Formation intensive avec des magistrats en exercice.",
  },
  {
    id: "2",
    title: "ENA (Tous cycles)",
    category: "Administration Publique",
    monthlyFee: 30000,
    registrationFee: 45000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Préparation complète aux concours de l'École Nationale d'Administration — cycles A, B et C.",
  },
  {
    id: "3",
    title: "Greffe",
    category: "Concours Juridiques",
    monthlyFee: 30000,
    registrationFee: 45000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Formation pour le concours de Greffier en chef et Greffier. Maîtrisez les procédures judiciaires.",
  },
  {
    id: "4",
    title: "Police",
    category: "Sécurité & Force Publique",
    monthlyFee: 30000,
    registrationFee: 35000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Préparation aux concours des Officiers et Sous-Officiers de Police avec encadrement d'experts.",
  },
  {
    id: "5",
    title: "Avocature & Notariat",
    category: "Concours Juridiques",
    monthlyFee: 30000,
    registrationFee: 45000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Formation aux concours du barreau et du notariat. Droit civil, procédures et déontologie.",
  },
  {
    id: "6",
    title: "Fonction Publique",
    category: "Administration Publique",
    monthlyFee: 30000,
    registrationFee: 45000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Préparation aux concours de la Fonction Publique ivoirienne — toutes catégories.",
  },
  {
    id: "7",
    title: "EPPJEJ & EPP",
    category: "Administration Publique",
    monthlyFee: 30000,
    registrationFee: 45000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Formation aux concours des écoles professionnelles de la justice et de l'administration.",
  },
  {
    id: "8",
    title: "Informatique",
    category: "Technologies & Métiers Numériques",
    monthlyFee: 25000,
    registrationFee: 35000,
    hasPresentiel: true,
    hasOnline: true,
    description:
      "Cours d'informatique et préparation aux concours technologiques de la fonction publique.",
  },
];

/* ─── Course Card Component ─── */
function CourseCard({
  course,
  index,
  showPrices,
  ctaLabel,
}: {
  course: any;
  index: number;
  showPrices: boolean;
  ctaLabel: string;
}) {
  const mFee = course.monthlyFee !== undefined ? Number(course.monthlyFee) : 30000;
  const regFee = course.registrationFee !== undefined ? Number(course.registrationFee) : 45000;
  const colorClass = getCourseColor(index);
  const iconColorClass = getCourseIconColor(index);

  return (
    <motion.div variants={staggerItem} className="group h-full">
      <div
        className={`relative flex flex-col h-full rounded-2xl bg-gradient-to-br ${colorClass} border p-5 hover:shadow-xl hover:shadow-gray-200 hover:-translate-y-1 transition-all duration-300`}
      >
        {/* Icon */}
        <div
          className={`w-12 h-12 ${iconColorClass} rounded-xl flex items-center justify-center mb-4 shadow-sm`}
        >
          {getCourseIcon(course.title, course.category)}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-extrabold text-gray-900 text-base mb-1 leading-tight group-hover:text-primary-700 transition-colors">
            {course.title}
          </h3>
          {course.category && (
            <p className="text-xs text-gray-500 font-medium mb-3">{course.category}</p>
          )}
          {course.description && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              {course.description}
            </p>
          )}
        </div>

        {/* Modes */}
        <div className="flex gap-1.5 mt-4 flex-wrap">
          {course.hasPresentiel !== false && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/75 rounded-lg text-[11px] font-bold text-gray-700 border border-gray-200 shadow-2xs">
              <MapPin size={10} className="text-emerald-600" /> Présentiel
            </span>
          )}
          {course.hasOnline !== false && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/75 rounded-lg text-[11px] font-bold text-gray-700 border border-gray-200 shadow-2xs">
              <Globe size={10} className="text-blue-600" /> En ligne
            </span>
          )}
        </div>

        {/* Pricing */}
        {showPrices !== false && (
          <div className="mt-4 pt-4 border-t border-gray-200/70">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] text-gray-500 font-medium">Inscription</div>
                <div className="text-sm font-black text-gray-800">
                  {regFee.toLocaleString("fr-FR")} F
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-500 font-medium">Mensualité</div>
                <div className="text-lg font-black text-primary-700">
                  {mFee.toLocaleString("fr-FR")}
                  <span className="text-xs font-normal text-gray-400 ml-0.5">F/mois</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <Link to={course.id ? `/formation/${course.id}` : '/students/new'} className="mt-4 block">
          <button className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-md">
            Découvrir
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [catalogueConfig, setCatalogueConfig] = useState(DEFAULT_SITE_CONFIG.catalogue);

  // Synchronisation avec l'URL au chargement et aux changements d'URL
  useEffect(() => {
    const cat = searchParams.get("category");
    const q = searchParams.get("q");

    if (cat) {
      setActiveCategory(cat);
    } else {
      setActiveCategory("Tous");
    }

    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  /* Chargement config + formations + catégories */
  useEffect(() => {
    fetchSiteConfig()
      .then((data) => {
        const merged = mergeSiteConfig(data);
        setCatalogueConfig(merged.catalogue);
      })
      .catch(() => {});

    Promise.all([
      fetchCourses().catch(() => []),
      fetchCourseCategories().catch(() => []),
    ])
      .then(([courseData, catData]) => {
        if (Array.isArray(courseData) && courseData.length > 0) {
          setCourses(courseData);
        } else {
          setCourses(DEFAULT_COURSES);
        }
        if (Array.isArray(catData)) {
          setDbCategories(catData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* Catégories dynamiques disponibles */
  const availableCategories = useMemo(() => {
    const fromCourses = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    const fromDb = dbCategories.map((c) => c.name).filter(Boolean);
    const set = new Set([...fromCourses, ...fromDb]);
    return ["Tous", ...Array.from(set)];
  }, [courses, dbCategories]);

  // Gestion du changement de catégorie
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === "Tous") {
      newParams.delete("category");
    } else {
      newParams.set("category", cat);
    }
    setSearchParams(newParams);
  };

  // Gestion de la saisie de recherche
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set("q", val.trim());
    } else {
      newParams.delete("q");
    }
    setSearchParams(newParams);
  };

  /* Formations de la catégorie active */
  const categoryCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = activeCategory === "Tous" || c.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [courses, activeCategory, searchQuery]);

  /* Autres formations suggérées (quand une catégorie spécifique est active) */
  const otherSuggestedCourses = useMemo(() => {
    if (activeCategory === "Tous") return [];
    return courses.filter((c) => c.category !== activeCategory);
  }, [courses, activeCategory]);

  const activeCategoryMeta = dbCategories.find((c) => c.name === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Hero ─── */}
      <section className="relative bg-gradient-hero py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-20 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-10 left-20 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
        </div>
        <Container className="relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div variants={staggerItem}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/20 text-accent-400 text-sm font-bold mb-6 border border-accent-500/30">
                <GraduationCap size={15} />
                {courses.length > 0 ? `${courses.length} formations officielles` : "Nos formations"}
              </span>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4"
            >
              {activeCategory !== "Tous"
                ? activeCategory
                : catalogueConfig.title || "Catalogue des Formations"}
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-gray-300 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            >
              {activeCategory !== "Tous"
                ? activeCategoryMeta?.description ||
                  `Découvrez l'ensemble de nos cycles préparatoires d'excellence pour le concours : ${activeCategory}.`
                : catalogueConfig.subtitle ||
                  "Toutes nos formations préparatoires aux concours de la fonction publique."}
            </motion.p>

            {/* Search bar */}
            <motion.div variants={staggerItem} className="relative max-w-xl mx-auto">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Rechercher une formation, un concours…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 text-sm sm:text-base focus:outline-none focus:border-accent-400 focus:bg-white/15 transition-all shadow-lg"
              />
            </motion.div>
          </motion.div>
        </Container>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 80L60 73C120 67 240 53 360 49C480 44 600 49 720 53C840 58 960 62 1080 60C1200 58 1320 49 1380 44L1440 40V80H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ─── Filters bar ─── */}
      <section className="py-4 border-b border-gray-100 bg-white sticky top-14 z-30 shadow-xs">
        <Container>
          <div className="flex items-center justify-between gap-3 overflow-x-auto py-1 scrollbar-none">
            <div className="flex gap-2 items-center shrink-0">
              <Filter size={16} className="text-gray-400 shrink-0 mr-1" />
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                    activeCategory === cat
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/25"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                  {cat !== "Tous" && (
                    <span className="ml-1.5 opacity-75 text-xs font-normal">
                      ({courses.filter((c) => c.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeCategory !== "Tous" && (
              <button
                onClick={() => handleCategoryChange("Tous")}
                className="text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </Container>
      </section>

      {/* ─── Main Formations Grid ─── */}
      <section className="py-10 sm:py-14">
        <Container>
          {/* Header pour catégorie active */}
          {activeCategory !== "Tous" && (
            <div className="mb-8 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-accent-50 text-accent-700 text-xs font-black uppercase tracking-wider">
                    Catégorie sélectionnée
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {categoryCourses.length} formation{categoryCourses.length > 1 ? "s" : ""} trouvée
                    {categoryCourses.length > 1 ? "s" : ""}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mt-1">
                  Formations disponibles pour « {activeCategory} »
                </h2>
              </div>

              <button
                onClick={() => handleCategoryChange("Tous")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3.5 py-2 rounded-xl transition-colors shrink-0"
              >
                <span>Voir toutes les filières</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={36} className="animate-spin text-primary-500" />
            </div>
          ) : categoryCourses.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-400">Aucune formation trouvée</p>
              <p className="text-gray-500 mt-2 text-sm">
                Aucun résultat ne correspond à vos critères de recherche.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  handleCategoryChange("Tous");
                }}
                className="mt-6 px-5 py-2.5 bg-primary-50 text-primary-600 rounded-xl font-semibold text-sm hover:bg-primary-100 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory + searchQuery}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {categoryCourses.map((course, i) => (
                <CourseCard
                  key={course.id || i}
                  course={course}
                  index={i}
                  showPrices={catalogueConfig.showPrices !== false}
                  ctaLabel={catalogueConfig.ctaLabel || "S'inscrire"}
                />
              ))}
            </motion.div>
          )}

          {/* ─── Proposition d'autres formations (si catégorie spécifique sélectionnée) ─── */}
          {activeCategory !== "Tous" && otherSuggestedCourses.length > 0 && (
            <div className="mt-16 pt-12 border-t-2 border-dashed border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 text-accent-700 text-xs font-black uppercase tracking-wider mb-2">
                    <Sparkles size={13} className="text-accent-500" />
                    <span>Opportunités complémentaires</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    Découvrez aussi nos autres préparations
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-xl">
                    Excellence Académie propose également des cycles préparatoires d'élite dans les
                    autres branches de la fonction publique ivoirienne.
                  </p>
                </div>

                <button
                  onClick={() => handleCategoryChange("Tous")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary-300 text-primary-700 text-xs font-bold hover:bg-primary-50 transition-colors shrink-0"
                >
                  <span>Explorer tout le catalogue ({courses.length})</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {otherSuggestedCourses.slice(0, 4).map((course, i) => (
                  <CourseCard
                    key={course.id || `sugg-${i}`}
                    course={course}
                    index={i + 2}
                    showPrices={catalogueConfig.showPrices !== false}
                    ctaLabel={catalogueConfig.ctaLabel || "S'inscrire"}
                  />
                ))}
              </motion.div>
            </div>
          )}
        </Container>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-16 bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <Container className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={20} className="text-yellow-400" fill="currentColor" />
              ))}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Prêt à commencer votre préparation d'excellence ?
            </h2>
            <p className="text-gray-300 mb-8 text-sm sm:text-base leading-relaxed">
              Rejoignez des centaines de lauréats qui ont fait confiance à Excellence Académie pour
              intégrer la fonction publique en Côte d'Ivoire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/students/new">
                <Button variant="accent" size="lg" iconRight={<ArrowRight size={18} />}>
                  S'inscrire maintenant
                </Button>
              </Link>
              <Link to="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Retour à l'accueil
                </Button>
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  );
}
