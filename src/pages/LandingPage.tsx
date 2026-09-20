import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  MapPin, Globe, ChevronRight, ChevronLeft,
  Gavel, Users, User, Shield, Building2,
  Award, Scale, BookOpen, Clock, CheckCircle,
  Trophy, Star, ArrowRight, Quote, CreditCard,
  Upload, X as XIcon, Loader2, AlertCircle, Sparkles,
  Play, Target, Zap, TrendingUp, GraduationCap, Phone, Send
} from "lucide-react";
import { fetchTestimonials, createTestimonial, uploadTestimonialImages, fetchPublicBanners, fetchPublicCourses, fetchSiteConfig, getMe } from '../utils/api';
import { Link } from 'react-router-dom';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Badge, Button, Card, SectionTitle, Container, Rating } from '../components/ui';
import SEOHead from '../components/SEOHead';
import {
  DEFAULT_SITE_CONFIG,
  mergeSiteConfig,
  type HomeConfig,
  type SectionConfig,
  type HeroConfig,
  type HowConfig,
  type AtotsConfig,
  type TarifsConfig,
  type CtaConfig,
} from '../constants/siteConfig';

interface BannerItem {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
}

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function getDashboardUrl(user: any) {
  if (!user) return "/student/login";
  switch (user.role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "TEACHER":
      return "/teacher/dashboard";
    case "ACCOUNTANT":
      return "/accountant/dashboard";
    case "SECRETARY":
      return "/secretary/dashboard";
    default:
      return "/student/dashboard";
  }
}

/* ─── Hero Section ─── */
function Hero({ config, currentUser }: { config: HeroConfig; currentUser?: any }) {
  if (config.enabled === false) return null;

  return (
    <section id="hero" className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-hero">
      {/* Background animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-300/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Background image overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/hero_bg.png')" }}
      />

      <Container className="relative z-10 w-full py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <Badge variant="accent" dot className="mb-6">
                {config.badge}
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight"
            >
              {config.titleLine1}{" "}
              <span className="text-accent-500">{config.titleHighlight}</span>{" "}
              {config.titleLine2}
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-gray-300 text-base sm:text-lg lg:text-xl mb-8 max-w-xl leading-relaxed"
            >
              {config.subtitle}
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 mb-10">
              {currentUser ? (
                <>
                  <Link to={getDashboardUrl(currentUser)}>
                    <Button variant="accent" size="lg" iconRight={<ArrowRight size={18} />}>
                      Mon Espace
                    </Button>
                  </Link>
                  <Link to="/catalogue">
                    <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                      Découvrir les formations
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/catalogue">
                    <Button variant="accent" size="lg" iconRight={<ArrowRight size={18} />}>
                      {config.ctaPrimary}
                    </Button>
                  </Link>
                  <Link to="/students/new">
                    <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                      {config.ctaSecondary}
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>

            <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-primary-600 border-2 border-primary-700 flex items-center justify-center text-white text-xs font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{config.heroStudentsCount}</div>
                  <div className="text-gray-400 text-xs">étudiants formés</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <span className="text-white font-bold text-sm">{config.heroRating}</span>
                <span className="text-gray-400 text-xs">avis vérifiés</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Decorative visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" as const }}
            className="hidden lg:block relative"
          >
            <div className="relative">
              {/* Floating card 1 */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" as const }}
                className="absolute -top-8 -left-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{config.heroAdmisLabel}</div>
                    <div className="text-gray-300 text-xs">{config.heroAdmisConcours}</div>
                  </div>
                </div>
              </motion.div>

              {/* Floating card 2 */}
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay: 1 }}
                className="absolute -bottom-4 -right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                    <TrendingUp size={24} className="text-accent-400" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{config.heroTauxReussite}</div>
                    <div className="text-gray-300 text-xs">Taux de réussite</div>
                  </div>
                </div>
              </motion.div>

              {/* Central visual */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 lg:p-12">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: <Gavel size={28} />, label: "Magistrature", color: "from-orange-500/20 to-orange-700/20" },
                    { icon: <Building2 size={28} />, label: "ENA", color: "from-amber-500/20 to-amber-700/20" },
                    { icon: <Scale size={28} />, label: "Notariat", color: "from-green-500/20 to-green-600/20" },
                    { icon: <Shield size={28} />, label: "Greffe", color: "from-red-500/20 to-red-600/20" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                      className={`bg-gradient-to-br ${item.color} backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-white/30 transition-colors`}
                    >
                      <div className="text-white mb-3 flex justify-center">{item.icon}</div>
                      <div className="text-white/80 text-sm font-semibold">{item.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 110C120 100 240 80 360 73.3C480 66.7 600 73.3 720 80C840 86.7 960 93.3 1080 90C1200 86.7 1320 73.3 1380 66.7L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ─── Stats Ribbon ─── */
function getStatIcon(icon?: string) {
  switch (icon) {
    case 'magistrature': return <Gavel size={20} />;
    case 'ena':          return <Building2 size={20} />;
    case 'cities':       return <MapPin size={20} />;
    case 'online':       return <Globe size={20} />;
    case 'trophy':       return <Trophy size={20} />;
    case 'users':        return <Users size={20} />;
    case 'award':        return <Award size={20} />;
    case 'star':         return <Star size={20} />;
    default:             return <Globe size={20} />;
  }
}

function StatsRibbon({ config }: { config: HomeConfig['stats'] }) {
  const { ref, isInView } = useScrollAnimation();
  if (config.enabled === false || !config.items || config.items.length === 0) return null;

  return (
    <div ref={ref} className="py-6 sm:py-8 bg-white border-b border-gray-100">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
        >
          {config.items.map((s, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="text-center p-4 rounded-2xl bg-gray-50/50 border border-gray-100"
            >
              <div className="w-10 h-10 bg-primary-50 text-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                {getStatIcon(s.icon)}
              </div>
              <div className="text-3xl font-black text-primary-700">{s.number}</div>
              <div className="text-xs text-gray-500 font-bold uppercase mt-1 tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </div>
  );
}

/* ─── Actualité / Bannières ─── */
const DEFAULT_FEATURED_BANNERS: any[] = [
  { id: "def-b1", title: "Sessions Préparatoires aux Concours Directs", subtitle: "Inscriptions ouvertes pour toutes les filières", imageUrl: "/images/image2.jpeg", linkUrl: "/catalogue" },
  { id: "def-b2", title: "Encadrement par les Magistrats et Formateurs Experts", subtitle: "Méthodologie et sujets types décryptés", imageUrl: "/images/image1.jpeg", linkUrl: "/catalogue" },
  { id: "def-b3", title: "Formations En ligne & Présentiel", subtitle: "Cours du soir, week-ends et suivi sur mesure", imageUrl: "/images/image3.jpeg", linkUrl: "/catalogue" },
  { id: "def-b4", title: "Excellence Académie à vos côtés", subtitle: "L'école de référence pour votre réussite", imageUrl: "/images/images4.jpeg", linkUrl: "/catalogue" },
];

function Actualite({ config }: { config?: SectionConfig }) {
  const { ref, isInView } = useScrollAnimation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [featuredItems, setFeaturedItems] = useState<BannerItem[]>(DEFAULT_FEATURED_BANNERS);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const banners = await fetchPublicBanners();
        if (Array.isArray(banners)) {
          const featured = banners.filter((b: any) => b.isActive && b.imageUrl);
          if (featured.length > 0) {
            setFeaturedItems(featured);
          }
        }
      } catch (error) { console.error('Erreur chargement bannières', error); }
    };
    loadFeatured();
  }, []);

  if (config?.enabled === false) return null;
  const slides = featuredItems.length > 0 ? featuredItems : DEFAULT_FEATURED_BANNERS;

  return (
    <section id="actualite" className="py-12 sm:py-16 bg-surface-50">
      <Container>
        <div ref={ref}>
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeUp}
          >
            <SectionTitle
              title={config?.title || 'À la une'}
              subtitle={config?.subtitle}
              badge={
                <Badge variant="accent" dot>
                  <Sparkles size={10} className="mr-1" />
                  Actualités & Événements
                </Badge>
              }
            />
          </motion.div>

          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={scaleIn}
            className="relative max-w-md mx-auto"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <Card padding="none" className="overflow-hidden">
              <div className="relative w-full" style={{ minHeight: '350px', maxHeight: '500px', height: '50vw' }}>
                <AnimatePresence mode="wait">
                  {slides.map((slide: any, i: number) => {
                    if (i !== currentIndex) return null;
                    const src = typeof slide === 'string' ? slide : slide.imageUrl;
                    return (
                      <motion.div
                        key={slide.id || i}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0"
                      >
                        <img
                          src={src}
                          alt={slide.title || `Actualité ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {(slide.title || slide.subtitle) && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-6 sm:p-8 text-white">
                            {slide.title && <h3 className="font-extrabold text-lg sm:text-xl leading-snug">{slide.title}</h3>}
                            {slide.subtitle && <p className="text-gray-200 text-sm sm:text-base mt-1">{slide.subtitle}</p>}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {slides.length > 1 && (
                  <>
                    <button onClick={() => setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                      className="absolute left-2 top-0 bottom-0 my-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-all hover:scale-105 z-10">
                      <ChevronLeft size={22} />
                    </button>
                    <button onClick={() => setCurrentIndex((prev) => (prev + 1) % slides.length)}
                      className="absolute right-2 top-0 bottom-0 my-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-all hover:scale-105 z-10">
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>

              {slides.length > 1 && (
                <div className="flex justify-center gap-2 py-4">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`transition-all duration-300 rounded-full ${currentIndex === i ? "w-8 h-2.5 bg-accent-500" : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                        }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Comment ça marche ─── */
function getHowIcon(index: number) {
  const icons = [<User size={24} />, <BookOpen size={24} />, <Target size={24} />, <GraduationCap size={24} />];
  return icons[index] ?? <Zap size={24} />;
}

function CommentCaMarche({ config }: { config: HowConfig }) {
  const { ref, isInView } = useScrollAnimation();
  if (config.enabled === false) return null;
  if (!config.steps || config.steps.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-white">
      <Container>
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp}>
            <SectionTitle
              title={config.title}
              subtitle={config.subtitle}
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative"
          >
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary-200 via-accent-200 to-primary-200" />

            {config.steps.map((step, i) => (
              <motion.div key={i} variants={staggerItem} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary-500/20 relative z-10">
                  {getHowIcon(i)}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center text-white text-xs font-black">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Atouts / Pourquoi nous ─── */
function getAtoutIcon(icon?: string) {
  switch (icon) {
    case 'trophy':  return <Trophy size={24} />;
    case 'users':   return <Users size={24} />;
    case 'mappin':  return <MapPin size={24} />;
    case 'globe':   return <Globe size={24} />;
    case 'award':   return <Award size={24} />;
    case 'shield':  return <Shield size={24} />;
    case 'star':    return <Star size={24} />;
    case 'zap':     return <Zap size={24} />;
    default:        return <CheckCircle size={24} />;
  }
}

function Atouts({ config }: { config: AtotsConfig }) {
  const { ref, isInView } = useScrollAnimation();
  if (config.enabled === false) return null;
  if (!config.items || config.items.length === 0) return null;

  return (
    <section id="atouts" className="py-16 sm:py-20 bg-surface-50">
      <Container>
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp}>
            <SectionTitle
              title={config.title}
              subtitle={config.subtitle}
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {config.items.map((a, i) => (
              <motion.div key={i} variants={staggerItem}>
                <Card hover className="h-full text-center p-6">
                  <div className={`w-14 h-14 bg-gradient-to-br ${a.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    {getAtoutIcon(a.icon)}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{a.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{a.desc}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Admis / Lauréats ─── */
function AdmisSection({ config }: { config: SectionConfig }) {
  const { ref, isInView } = useScrollAnimation();
  const [admisList, setAdmisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials()
      .then((data) => { if (Array.isArray(data)) setAdmisList(data.slice(0, 3)); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (config.enabled === false) return null;
  if (loading || admisList.length === 0) return null;

  return (
    <section id="admis" className="py-16 sm:py-20 bg-gradient-to-b from-white via-orange-50/20 to-white">
      <Container>
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp}>
            <SectionTitle
              title={config.title || "Nos Lauréats & Admis aux Concours"}
              subtitle={config.subtitle}
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {admisList.map((admis, idx) => {
              const hasPhoto = admis.images && admis.images.length > 0 && admis.images[0];
              return (
                <motion.div key={admis.id || idx} variants={staggerItem}>
                  <Card hover className="h-full flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-accent-400" />

                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative shrink-0">
                        {hasPhoto ? (
                          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-3 ring-accent-500/30 shadow-md">
                            <img src={admis.images[0]} alt={admis.name} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/images/image2.jpeg'; }} />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-xl font-black shadow-md">
                            {admis.name?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-accent-500 text-white p-1 rounded-full shadow">
                          <Award size={13} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Badge variant="accent" size="sm" className="mb-1">
                          <Trophy size={10} className="mr-0.5" />
                          <span className="truncate">{admis.course}</span>
                        </Badge>
                        <h3 className="font-extrabold text-gray-900 text-sm sm:text-base truncate">{admis.name}</h3>
                        <Rating value={admis.rating || 5} size="sm" className="mt-1" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <Quote size={18} className="text-accent-200 mb-1" />
                      <p className="text-gray-600 text-sm italic leading-relaxed">"{admis.message}"</p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={12} /> Admis officiel
                      </span>
                      <span className="text-primary-700 uppercase tracking-wider text-[10px]">Excellence Académie</span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp} className="mt-8 text-center">
            <Link to="/students/new">
              <Button variant="accent" iconRight={<ArrowRight size={16} />}>
                Rejoindre la prochaine promotion d'admis
              </Button>
            </Link>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Formations ─── */
function Formations({ config }: { config: SectionConfig }) {
  const { ref, isInView } = useScrollAnimation();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultForms = [
    { title: "CAFOP (Centre d'Animation et de Formation Pédagogique)", category: "Administration Publique", monthlyFee: 30000, hasPresentiel: true, hasOnline: false },
    { title: "ENA (Tous cycles)", category: "Administration Publique", monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Avocature / CAPA / CPFA (Centre de Formation Professionnelle des Avocats)", category: "Autres concours judiciaires", monthlyFee: 35000, hasPresentiel: true, hasOnline: true },
    { title: "Notaire (Examen de Premier Clerc de Notaire et de Notaire)", category: "Autres concours judiciaires", monthlyFee: 35000, hasPresentiel: true, hasOnline: true },
    { title: "Institut International des Assurances (IIA) / CPFA", category: "Finances & Gestion", monthlyFee: 35000, hasPresentiel: true, hasOnline: true },
    { title: "Ecole du Personnel de la Protection Judiciaire de l'Enfance et de la Jeunesse (EPPJEJ)", category: "INFJ", monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "EPP (Tous cycles) / Ecole du Personnel Pénitentiaire", category: "INFJ", monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Greffe (Tous cycles)", category: "INFJ", monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Magistrature", category: "INFJ", monthlyFee: 35000, hasPresentiel: true, hasOnline: true },
    { title: "Art Oratoire", category: "Psychologie", monthlyFee: 70000, hasPresentiel: true, hasOnline: true },
    { title: "Développement Personnel et Leadership Chrétien", category: "Religion", monthlyFee: 100000, hasPresentiel: true, hasOnline: true },
    { title: "Police (Officier et Commissaire de Police)", category: "Sécurité & Force Publique", monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
    { title: "Informatique", category: "Technologies & Métiers Numériques", monthlyFee: 30000, hasPresentiel: true, hasOnline: true },
  ];

  useEffect(() => {
    fetchPublicCourses()
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCourses(data); else setCourses(defaultForms); })
      .catch(() => setCourses(defaultForms))
      .finally(() => setLoading(false));
  }, []);

  if (config.enabled === false) return null;

  const displayCourses = courses.length > 0 ? courses : defaultForms;

  const getIcon = (title: string = '', category: string = '') => {
    const t = (title + ' ' + category).toLowerCase();
    if (t.includes('magistr') || t.includes('greff')) return <Gavel size={20} />;
    if (t.includes('ena') || t.includes('fonction') || t.includes('epp')) return <Building2 size={20} />;
    if (t.includes('police') || t.includes('sécurité') || t.includes('securite')) return <Shield size={20} />;
    if (t.includes('avocat') || t.includes('notari') || t.includes('droit')) return <Scale size={20} />;
    if (t.includes('info') || t.includes('numériqu') || t.includes('techno')) return <Award size={20} />;
    return <BookOpen size={20} />;
  };

  return (
    <section id="formations" className="py-16 sm:py-20 bg-white">
      <Container>
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp}>
            <SectionTitle
              title={config.title || "Nos Formations & Concours"}
              subtitle={config.subtitle}
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="flex flex-wrap justify-center gap-4"
          >
            {displayCourses.map((f, i) => {
              const mFee = f.monthlyFee !== undefined ? Number(f.monthlyFee) : 30000;
              return (
                <motion.div key={f.id || i} variants={staggerItem} className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)]">
                  <Link to={f.id ? `/formation/${f.id}` : '/catalogue'} className="block h-full">
                    <Card hover className="h-full flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center text-accent-500 shrink-0 group-hover:scale-110 transition-transform">
                          {getIcon(f.title, f.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 text-sm group-hover:text-primary-500 transition-colors truncate">{f.title}</h3>
                          {f.category && <p className="text-xs text-gray-500 truncate">{f.category}</p>}
                        </div>
                      </div>

                      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {f.hasPresentiel !== false && <Badge size="sm">Présentiel</Badge>}
                          {f.hasOnline !== false && <Badge variant="primary" size="sm">En ligne</Badge>}
                        </div>
                        <div className="font-black text-accent-500 text-sm">
                          {mFee.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">F/mois</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp} className="mt-8 text-center">
            <Link to="/catalogue">
              <Button variant="outline" iconRight={<ArrowRight size={16} />}>
                Voir tout le catalogue
              </Button>
            </Link>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Tarifs ─── */
function Tarifs({ config }: { config: TarifsConfig }) {
  const { ref, isInView } = useScrollAnimation();
  if (config.enabled === false) return null;

  const inscriptionList =
    config.inscription && config.inscription.length > 0
      ? config.inscription
      : DEFAULT_SITE_CONFIG.tarifs.inscription;

  const mensualitesList =
    config.mensualites && config.mensualites.length > 0
      ? config.mensualites
      : DEFAULT_SITE_CONFIG.tarifs.mensualites;

  const paymentMethods = [
    { name: "Wave", logo: "/images/logo-wave.png" },
    { name: "Orange Money", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" },
    { name: "MTN MoMo", logo: "https://upload.wikimedia.org/wikipedia/commons/a/af/MTN_Logo.svg" },
    { name: "Moov Money", logo: "/images/moov.png" },
    { name: "Espèces", icon: <CreditCard size={24} className="text-emerald-600" /> },
  ];

  return (
    <section id="tarifs" className="py-16 sm:py-20 bg-surface-50">
      <Container>
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp}>
            <SectionTitle title={config.title || "Tarifs & Inscription"} subtitle={config.subtitle || "Des tarifs accessibles pour une préparation d'excellence."} />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto"
          >
            {/* Inscription */}
            {inscriptionList && inscriptionList.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="h-full p-6 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center font-bold">
                      <CheckCircle size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-gray-900 leading-none">Frais d'Inscription</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Payables une seule fois à l'admission</p>
                    </div>
                  </div>
                  <ul className="space-y-3.5 text-sm text-gray-600">
                    {inscriptionList.map((ligne, i) => (
                      <li key={i} className={`flex justify-between items-center ${i < inscriptionList.length - 1 ? 'border-b border-gray-50 pb-3' : 'pb-1'}`}>
                        <span className="font-medium text-gray-700">{ligne.label}</span>
                        <span className="font-black text-gray-900 text-base">{ligne.value}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* Mensualités */}
            {mensualitesList && mensualitesList.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="h-full p-6 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-gray-900 leading-none">Mensualités</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Tarification mensuelle selon la formule</p>
                    </div>
                  </div>
                  <ul className="space-y-3.5 text-sm text-gray-600">
                    {mensualitesList.map((ligne, i) => (
                      <li key={i} className={`flex justify-between items-center ${i < mensualitesList.length - 1 ? 'border-b border-gray-50 pb-3' : 'pb-1'}`}>
                        <span className="font-medium text-gray-700">{ligne.label}</span>
                        <span className="font-black text-primary-700 text-base">{ligne.value}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}
          </motion.div>

          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={scaleIn}>
            <Card className="text-center">
              <Link to="/students/new">
                <Button variant="accent" size="lg" className="mb-6">{config.ctaLabel || "Rejoins-nous maintenant"}</Button>
              </Link>
              <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
                {paymentMethods.map((m, i) => (
                  <div key={i} className="flex flex-col items-center justify-center bg-surface-50 p-3 rounded-xl border border-gray-100 w-24 hover:shadow-card transition-shadow">
                    <div className="h-10 flex items-center justify-center mb-2">
                      {m.icon ? m.icon : <img src={m.logo} alt={m.name} className="h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.25'; }} />}
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{m.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">Payez en toute simplicité avec Wave, Orange Money, MTN MoMo ou en espèces.</p>
            </Card>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials({ config }: { config: SectionConfig }) {
  const { ref, isInView } = useScrollAnimation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTestimonials()
      .then(d => { if (Array.isArray(d)) setData(d); })
      .catch(() => setError("Impossible de charger les avis"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data.length <= 1 || isPaused) return;
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % data.length), 5000);
    return () => clearInterval(interval);
  }, [data.length, isPaused]);

  const resetForm = () => { setFormError(null); setFormSuccess(false); setImages([]); setMessageCount(0); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (images.length + files.length > 3) { setFormError("Maximum 3 images autorisées."); if (e.target) e.target.value = ''; return; }
    setFormError(null);
    setUploadingImages(true);
    try { const urls = await uploadTestimonialImages(files); setImages(prev => [...prev, ...urls]); }
    catch (err: any) { setFormError(err.message); }
    finally { setUploadingImages(false); if (e.target) e.target.value = ''; }
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setFormError(null); setFormSuccess(false); setFormSubmitting(true);
    const form = e.currentTarget; const formData = new FormData(form);
    try {
      await createTestimonial({ name: formData.get('name') as string, course: formData.get('course') as string, message: formData.get('message') as string, rating: parseInt(formData.get('rating') as string) || 5, images });
      setFormSuccess(true); form.reset(); setImages([]); setMessageCount(0);
      setTimeout(() => { setModalOpen(false); setTimeout(() => setFormSuccess(false), 300); }, 2500);
    } catch (err: any) { setFormError(err.message); } finally { setFormSubmitting(false); }
  };

  if (config.enabled === false) return null;
  if (error || loading || data.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-surface-50 to-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent-50 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 opacity-60" />

      <Container className="relative z-10">
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp}>
            <SectionTitle
              title={config.title || "Ils nous font confiance"}
              subtitle={config.subtitle}
            />
          </motion.div>

          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={scaleIn}>
            <div className="relative max-w-3xl mx-auto"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}>
              <Card padding="none" className="overflow-hidden">
                <div className="relative min-h-[320px]">
                  <AnimatePresence mode="wait">
                    {data.map((t, i) => {
                      if (i !== currentIndex) return null;
                      return (
                        <motion.div
                          key={t.id || i}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.5 }}
                          className="p-8 md:p-12 flex flex-col items-center text-center"
                        >
                          <div className="relative mb-6">
                            {t.images && t.images.length > 0 ? (
                              <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
                                <img src={t.images[0]} alt={t.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                {t.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-accent-500 text-white p-1.5 rounded-full shadow-md">
                              <Quote size={14} fill="currentColor" />
                            </div>
                          </div>
                          <Rating value={t.rating || 5} size="md" className="mb-4" />
                          <p className="text-gray-700 text-lg md:text-xl italic font-medium mb-8 leading-relaxed">"{t.message}"</p>
                          <div className="mt-auto">
                            <div className="font-bold text-primary-700 text-base md:text-lg">{t.name}</div>
                            <Badge variant="accent" size="sm" className="mt-2">{t.course}</Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </Card>

              {data.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {data.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIndex(i)}
                      className={`transition-all duration-300 rounded-full ${currentIndex === i ? "w-8 h-2.5 bg-accent-500" : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"}`}
                      aria-label={`Avis ${i + 1}`} />
                  ))}
                </div>
              )}

              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => { resetForm(); setModalOpen(true); }}>
                  Donner votre avis
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Testimonial Form Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-primary-700">Partagez votre expérience</h3>
                  <p className="text-gray-500 text-sm mt-1">Votre avis nous aide à nous améliorer</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                  <XIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2">
                    <CheckCircle size={16} /> Merci ! Votre avis a été soumis.
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom *</label>
                  <input name="name" type="text" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none transition-colors" placeholder="Ex: Jean D." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Formation suivie *</label>
                  <input name="course" type="text" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none transition-colors" placeholder="Ex: ENA Cycle Moyen" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note sur 5 *</label>
                  <select name="rating" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none transition-colors bg-white">
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Très bien</option>
                    <option value="3">3 - Bien</option>
                    <option value="2">2 - Moyen</option>
                    <option value="1">1 - Décevant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Votre avis *</label>
                  <textarea name="message" required rows={4} maxLength={500} onChange={e => setMessageCount(e.target.value.length)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none transition-colors resize-none" placeholder="Partagez votre expérience..." />
                  <p className="text-xs text-gray-400 mt-1 text-right">{messageCount}/500</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Photos (max 3)</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {images.length < 3 && (
                      <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all">
                        {uploadingImages ? <Loader2 size={20} className="text-gray-400 animate-spin" /> : <><Upload size={20} className="text-gray-400" /><span className="text-xs text-gray-400 mt-1">Ajouter</span></>}
                        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={uploadingImages} />
                      </label>
                    )}
                    {images.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={url} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                          <XIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{images.length}/3 image(s)</p>
                </div>
                <button type="submit" disabled={formSubmitting || formSuccess}
                  className="w-full py-3.5 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {formSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {formSubmitting ? 'Envoi...' : 'Envoyer mon avis'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ─── CTA Final ─── */
function CtaFinal({ config, currentUser }: { config: CtaConfig; currentUser?: any }) {
  const { ref, isInView } = useScrollAnimation();
  if (config.enabled === false) return null;

  return (
    <section className="py-16 sm:py-20 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-20 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-20 w-64 h-64 bg-primary-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <Container className="relative z-10">
        <div ref={ref}>
          <motion.div initial="hidden" animate={isInView ? "visible" : "hidden"} variants={fadeUp} className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {currentUser ? "Poursuivez votre préparation d'excellence" : config.title}
            </h2>
            <p className="text-gray-300 text-base sm:text-lg mb-8">
              {currentUser
                ? "Retrouvez vos cours, devoirs et entraînements directement depuis votre tableau de bord."
                : config.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentUser ? (
                <Link to={getDashboardUrl(currentUser)}>
                  <Button variant="accent" size="lg" iconRight={<ArrowRight size={18} />}>
                    Mon Espace
                  </Button>
                </Link>
              ) : (
                <Link to="/students/new">
                  <Button variant="accent" size="lg" iconRight={<ArrowRight size={18} />}>
                    {config.ctaPrimary}
                  </Button>
                </Link>
              )}
              {config.phone && (
                <a href={`tel:${config.phone}`}>
                  <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:text-white" icon={<Phone size={18} />}>
                    {config.ctaSecondary}
                  </Button>
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/* ─── Export ─── */
export default function LandingPage() {
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => mergeSiteConfig(DEFAULT_SITE_CONFIG));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const cached = localStorage.getItem("user") || localStorage.getItem("currentUser");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    fetchSiteConfig()
      .then((data) => setHomeConfig(mergeSiteConfig(data)))
      .catch(() => {});

    getMe()
      .then((data) => {
        setCurrentUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-white selection:bg-accent-500 selection:text-white">
      <SEOHead
        title="Accueil"
        description="Excellence Académie – Leader de la formation aux concours en Côte d'Ivoire. Inscription formation concours : ENA, Magistrature, Greffe, Agent pénitentiaire, CAPA. 500+ étudiants formés, 51% de réussite."
        url="/"
        keywords="inscription formation concours, formation concours, ENA Côte d'Ivoire, magistrature, greffe, notaire, avocature, CAPA, agent pénitentiaire, Excellence Académie, Abidjan, inscription Excellence Académie"
      />
      <Hero config={homeConfig.hero} currentUser={currentUser} />
      <StatsRibbon config={homeConfig.stats} />
      <Actualite config={homeConfig.actualite} />
      <CommentCaMarche config={homeConfig.how} />
      <Atouts config={homeConfig.atouts} />
      <AdmisSection config={homeConfig.admis} />
      <Formations config={homeConfig.formations} />
      <Testimonials config={homeConfig.testimonials} />
      <CtaFinal config={homeConfig.cta} currentUser={currentUser} />
    </div>
  );
}
