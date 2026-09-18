import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Gavel,
  Shield,
  Scale,
  Award,
  MapPin,
  Globe,
  Users,
  CheckCircle,
  Clock,
  BadgeCheck,
  GraduationCap,
  CreditCard,
  Phone,
  Star,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { fetchCourseById, fetchCourses } from "../utils/api";
import { formatPrice, isDiaspora, isAbidjan } from "../constants/student";
import { courseRegistrationFee, courseMonthlyFee, type FeeSource } from "../constants/student";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function getIcon(title: string = "", category: string = "") {
  const t = (title + " " + category).toLowerCase();
  if (t.includes("magistr") || t.includes("greff")) return <Gavel size={28} />;
  if (t.includes("ena") || t.includes("fonction") || t.includes("epp")) return <Building2 size={28} />;
  if (t.includes("police") || t.includes("sécurité") || t.includes("securite")) return <Shield size={28} />;
  if (t.includes("avocat") || t.includes("notari") || t.includes("droit")) return <Scale size={28} />;
  if (t.includes("info") || t.includes("numériqu") || t.includes("techno")) return <Award size={28} />;
  return <BookOpen size={28} />;
}

function getCatColor(category: string = "") {
  const c = category.toLowerCase();
  if (c.includes("jurid")) return "from-amber-50 to-orange-50 border-amber-200 text-amber-800";
  if (c.includes("admin")) return "from-blue-50 to-indigo-50 border-blue-200 text-blue-800";
  if (c.includes("sécur") || c.includes("secur") || c.includes("force")) return "from-red-50 to-rose-50 border-red-200 text-red-800";
  if (c.includes("techno") || c.includes("info") || c.includes("numéri")) return "from-purple-50 to-violet-50 border-purple-200 text-purple-800";
  if (c.includes("santé") || c.includes("param")) return "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800";
  if (c.includes("éduc") || c.includes("ens")) return "from-cyan-50 to-sky-50 border-cyan-200 text-cyan-800";
  if (c.includes("finance") || c.includes("gestion")) return "from-lime-50 to-green-50 border-lime-200 text-lime-800";
  return "from-gray-50 to-slate-50 border-gray-200 text-gray-800";
}

function getIconBg(category: string = "") {
  const c = category.toLowerCase();
  if (c.includes("jurid")) return "bg-amber-100 text-amber-700";
  if (c.includes("admin")) return "bg-blue-100 text-blue-700";
  if (c.includes("sécur") || c.includes("secur") || c.includes("force")) return "bg-red-100 text-red-700";
  if (c.includes("techno") || c.includes("info") || c.includes("numéri")) return "bg-purple-100 text-purple-700";
  if (c.includes("santé") || c.includes("param")) return "bg-emerald-100 text-emerald-700";
  if (c.includes("éduc") || c.includes("ens")) return "bg-cyan-100 text-cyan-700";
  if (c.includes("finance") || c.includes("gestion")) return "bg-lime-100 text-lime-700";
  return "bg-gray-100 text-gray-700";
}

type ModeTab = "presentiel" | "en_ligne" | "les_deux";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModeTab>("presentiel");
  const [relatedCourses, setRelatedCourses] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchCourseById(id)
      .then((c) => {
        if (!c) {
          navigate("/catalogue");
          return;
        }
        setCourse(c);
        return fetchCourses();
      })
      .then((all) => {
        if (Array.isArray(all)) {
          setRelatedCourses(
            all.filter((c: any) => c.id !== id).slice(0, 4)
          );
        }
      })
      .catch(() => navigate("/catalogue"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#c97e00]" />
      </div>
    );
  }

  if (!course) return null;

  const cat = course.category || "Général";
  const catColor = getCatColor(cat);
  const iconBg = getIconBg(cat);
  const hasPres = course.hasPresentiel !== false;
  const hasOnl = course.hasOnline !== false;

  // Tarifs par zone
  const zones = [
    {
      key: "abidjan" as const,
      label: "Abidjan",
      icon: <Building2 size={18} />,
      color: "from-amber-500 to-[#c97e00]",
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      badge: "bg-amber-100 text-amber-800",
      regFee: courseRegistrationFee(course, "Côte d'Ivoire", "Abidjan"),
      monthlyFee: courseMonthlyFee(course, "Côte d'Ivoire", "presentiel"),
      monthlyFeeOnline: courseMonthlyFee(course, "Côte d'Ivoire", "en_ligne"),
      monthlyFeeBoth: courseMonthlyFee(course, "Côte d'Ivoire", "les_deux"),
    },
    {
      key: "interieur" as const,
      label: "Intérieur CI",
      icon: <MapPin size={18} />,
      color: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      badge: "bg-emerald-100 text-emerald-800",
      regFee: courseRegistrationFee(course, "Côte d'Ivoire", "Bouaké"),
      monthlyFee: courseMonthlyFee(course, "Côte d'Ivoire", "presentiel"),
      monthlyFeeOnline: courseMonthlyFee(course, "Côte d'Ivoire", "en_ligne"),
      monthlyFeeBoth: courseMonthlyFee(course, "Côte d'Ivoire", "les_deux"),
    },
    {
      key: "diaspora" as const,
      label: "Diaspora",
      icon: <Globe size={18} />,
      color: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      badge: "bg-blue-100 text-blue-800",
      regFee: courseRegistrationFee(course, "France", ""),
      monthlyFee: courseMonthlyFee(course, "France", "en_ligne"),
      monthlyFeeOnline: courseMonthlyFee(course, "France", "en_ligne"),
      monthlyFeeBoth: courseMonthlyFee(course, "France", "en_ligne"),
    },
  ];

  const allModeTabs: { id: ModeTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "presentiel", label: "Présentiel", icon: <Building2 size={16} />, desc: "Cours en centre de formation" },
    { id: "en_ligne", label: "En ligne", icon: <Globe size={16} />, desc: "Cours à distance (Google Meet)" },
    { id: "les_deux", label: "Présentiel + En ligne", icon: <Users size={16} />, desc: "Accès aux deux formats" },
  ];
  const modeTabs = allModeTabs.filter((t) => {
    if (t.id === "presentiel") return hasPres;
    if (t.id === "en_ligne") return hasOnl;
    return hasPres && hasOnl;
  });

  const features = [
    { icon: <BadgeCheck size={18} />, text: "Encadré par des magistrats et experts" },
    { icon: <Clock size={18} />, text: "Emploi du temps flexible" },
    { icon: <Users size={18} />, text: "Promotions limitées pour qualité d'enseignement" },
    { icon: <Star size={18} />, text: "Méthodologie éprouvée" },
    { icon: <GraduationCap size={18} />, text: "Taux de réussite élevé" },
    { icon: <CreditCard size={18} />, text: "Paiement en plusieurs fois" },
  ];

  return (
    <div className="min-h-screen bg-surface-50 pb-16">
      {/* Hero */}
      <div className={`bg-linear-to-br ${catColor} border-b`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors mb-6"
            >
              <ArrowLeft size={16} /> Retour au catalogue
            </Link>
          </motion.div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={`w-16 h-16 sm:w-20 sm:h-20 ${iconBg} rounded-2xl flex items-center justify-center shadow-lg shrink-0`}
            >
              {getIcon(course.title, cat)}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${catColor}`}>
                  {cat}
                </span>
                {hasPres && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/70 rounded-full text-xs font-bold text-gray-700 border border-gray-200">
                    <MapPin size={10} className="text-emerald-600" /> Présentiel
                  </span>
                )}
                {hasOnl && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/70 rounded-full text-xs font-bold text-gray-700 border border-gray-200">
                    <Globe size={10} className="text-blue-600" /> En ligne
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-2">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                  {course.description}
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Mode Tabs */}
            {modeTabs.length > 0 && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-[#c97e00]" />
                  Mode de formation
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {modeTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? "border-[#c97e00] bg-amber-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-1 ${activeTab === tab.id ? "text-[#c97e00]" : "text-gray-600"}`}>
                        {tab.icon}
                        <span className="font-bold text-sm">{tab.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{tab.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pricing by Zone */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-[#c97e00]" />
                Tarification par zone
              </h2>
              <div className="space-y-4">
                {zones.map((zone) => {
                  const currentMonthly =
                    activeTab === "en_ligne"
                      ? zone.monthlyFeeOnline
                      : activeTab === "les_deux"
                      ? zone.monthlyFeeBoth
                      : zone.monthlyFee;
                  const total = zone.regFee + currentMonthly;

                  return (
                    <div key={zone.key} className={`rounded-xl border-2 ${zone.border} ${zone.bg} p-5`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-10 h-10 rounded-lg bg-linear-to-br ${zone.color} text-white flex items-center justify-center shadow-sm`}>
                            {zone.icon}
                          </span>
                          <div>
                            <h3 className="font-black text-gray-900 text-sm">{zone.label}</h3>
                            <p className="text-[11px] text-gray-500">
                              {zone.key === "abidjan"
                                ? "Ville d'Abidjan"
                                : zone.key === "interieur"
                                ? "Toutes les villes de CI sauf Abidjan"
                                : "Résidents hors de Côte d'Ivoire"}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${zone.badge}`}>
                          {zone.key === "abidjan" ? "Standard" : zone.key === "interieur" ? "Réduit" : "International"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-gray-500 font-medium">Frais d'inscription</span>
                          <div className="text-xl font-black text-gray-900">{formatPrice(zone.regFee)} <span className="text-xs font-normal text-gray-400">FCFA</span></div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 font-medium">
                            Mensualité ({modeTabs.find((t) => t.id === activeTab)?.label || "Présentiel"})
                          </span>
                          <div className="text-xl font-black text-[#c97e00]">{formatPrice(currentMonthly)} <span className="text-xs font-normal text-gray-400">F/mois</span></div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Total 1er mois (inscription + mensualité)</span>
                        <span className="font-black text-gray-900">{formatPrice(total)} <span className="text-xs font-normal text-gray-400">FCFA</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Features */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-[#c97e00]" />
                Avantages de cette formation
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-amber-200 transition-colors">
                    <span className="text-[#c97e00] shrink-0">{f.icon}</span>
                    <span className="text-sm text-gray-700 font-medium">{f.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Sticky CTA Card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.15 }}
              className="lg:sticky lg:top-24"
            >
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-br from-[#c97e00] to-amber-600 p-5 text-white">
                  <h3 className="font-black text-lg mb-1">Prêt à vous inscrire ?</h3>
                  <p className="text-amber-100 text-xs">Rejoignez {course._count?.subscriptions || 0} étudiant{course._count?.subscriptions !== 1 ? 's' : ''} inscrit{course._count?.subscriptions !== 1 ? 's' : ''}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Prix rapide */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">À partir de</div>
                    <div className="text-2xl font-black text-[#c97e00]">
                      {formatPrice(zones[0].regFee + (activeTab === "en_ligne" ? zones[0].monthlyFeeOnline : activeTab === "les_deux" ? zones[0].monthlyFeeBoth : zones[0].monthlyFee))} <span className="text-sm font-normal text-gray-400">FCFA</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Frais d'inscription + 1er mois (Abidjan)</div>
                  </div>

                  {/* Points forts */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      <span>Formation certifiante</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      <span>Paiement en plusieurs fois</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      <span>Support pédagogique inclus</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link to="/students/new" className="block">
                    <button className="w-full py-3.5 bg-[#c97e00] hover:bg-[#7a4b00] text-white font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer">
                      S'inscrire maintenant
                      <ArrowRight size={16} />
                    </button>
                  </Link>

                  <p className="text-center text-[11px] text-gray-400">
                    <Phone size={10} className="inline mr-1" />
                    Besoin d'aide ? Contactez-nous
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Related Courses */}
        {relatedCourses.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mt-16"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Autres formations</h2>
                <p className="text-sm text-gray-500 mt-1">Découvrez nos autres cycles préparatoires</p>
              </div>
              <Link
                to="/catalogue"
                className="text-sm font-semibold text-[#c97e00] hover:text-[#7a4b00] flex items-center gap-1"
              >
                Voir tout <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedCourses.map((rc) => {
                const rcCat = rc.category || "Général";
                const rcIconBg = getIconBg(rcCat);
                const rcMFee = rc.monthlyFee !== undefined ? Number(rc.monthlyFee) : 30000;
                return (
                  <motion.div key={rc.id} variants={staggerItem}>
                    <Link
                      to={`/formation/${rc.id}`}
                      className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-amber-200 transition-all group h-full"
                    >
                      <div className={`w-12 h-12 ${rcIconBg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        {getIcon(rc.title, rcCat)}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-[#c97e00] transition-colors">
                        {rc.title}
                      </h3>
                      {rc.category && (
                        <p className="text-xs text-gray-500 mb-3">{rc.category}</p>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex gap-1">
                          {rc.hasPresentiel !== false && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Présentiel</span>
                          )}
                          {rc.hasOnline !== false && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">En ligne</span>
                          )}
                        </div>
                        <span className="font-black text-[#c97e00] text-sm">
                          {rcMFee.toLocaleString("fr-FR")} <span className="text-[10px] font-normal text-gray-400">F/mois</span>
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
