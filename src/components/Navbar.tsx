import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ShoppingCart,
  Search,
  ChevronDown,
  User,
  BookOpen,
  Phone,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Tag,
  ArrowRight,
} from "lucide-react";
import { openCartDrawer } from "./CartDrawer";
import { readCart, getCartCount } from "../utils/cart";
import { cn } from "../utils/cn";
import { fetchSiteConfig, fetchCourseCategories, fetchCourses, getMe } from "../utils/api";
import { mergeSiteConfig, DEFAULT_SITE_CONFIG } from "../constants/siteConfig";

interface CategoryItem {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  coursesCount?: number;
}

interface CourseItem {
  id: string;
  title: string;
  category?: string;
  description?: string;
  price?: number;
  monthlyFee?: number;
}

const baseNavLinks = [
  { label: "Formations", href: "/catalogue" },
  { label: "Boutique", href: "/shop" },
  { label: "Blog", href: "/blog" },
];

const POPULAR_SEARCHES = [
  "Magistrature",
  "ENA",
  "Greffe",
  "Police",
  "Informatique",
  "Fonction Publique",
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogueEnabled, setCatalogueEnabled] = useState(
    DEFAULT_SITE_CONFIG.catalogue.enabled !== false
  );

  // Catégories & Formations dynamiques
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);

  // Utilisateur connecté
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const cached = localStorage.getItem("user") || localStorage.getItem("currentUser");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    getMe()
      .then((data) => {
        setCurrentUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      })
      .catch(() => {
        setCurrentUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("currentUser");
      });
  }, [location.pathname]);

  const getDashboardUrl = (user: any) => {
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
  };

  // Recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const catRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Charger la config du site pour savoir si le catalogue est activé
  useEffect(() => {
    fetchSiteConfig()
      .then((data) => {
        const merged = mergeSiteConfig(data);
        setCatalogueEnabled(merged.catalogue.enabled !== false);
      })
      .catch(() => {});
  }, []);

  // Charger les catégories et les formations depuis l'API
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchCourseCategories().catch(() => []),
      fetchCourses().catch(() => []),
    ]).then(([cats, crs]) => {
      if (!isMounted) return;
      const crsList: CourseItem[] = Array.isArray(crs) ? crs : [];
      setCourses(crsList);

      if (Array.isArray(cats) && cats.length > 0) {
        const enriched: CategoryItem[] = cats.map((c: any) => {
          const count = crsList.filter((x) => x.category === c.name).length;
          return {
            id: c.id,
            name: c.name,
            description: c.description,
            color: c.color,
            coursesCount: count || c.coursesCount || 0,
          };
        });
        setCategories(enriched);
      } else {
        // Fallback depuis les formations
        const distinct = Array.from(
          new Set(crsList.map((c) => c.category).filter(Boolean))
        );
        if (distinct.length > 0) {
          setCategories(
            distinct.map((name) => ({
              name: name as string,
              coursesCount: crsList.filter((c) => c.category === name).length,
            }))
          );
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = baseNavLinks;

  useEffect(() => {
    const updateCount = () => setCartCount(getCartCount(readCart()));
    updateCount();
    window.addEventListener("shopCartUpdated", updateCount);
    return () => window.removeEventListener("shopCartUpdated", updateCount);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setCatOpen(false);
    setSearchOpen(false);
    setSearchFocused(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen) {
      mobileSearchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Recherche : calcul des résultats
  const qTrim = searchQuery.trim().toLowerCase();
  const filteredCourses = qTrim
    ? courses
        .filter(
          (c) =>
            c.title?.toLowerCase().includes(qTrim) ||
            c.category?.toLowerCase().includes(qTrim) ||
            c.description?.toLowerCase().includes(qTrim)
        )
        .slice(0, 5)
    : [];

  const filteredCategories = qTrim
    ? categories
        .filter(
          (cat) =>
            cat.name.toLowerCase().includes(qTrim) ||
            cat.description?.toLowerCase().includes(qTrim)
        )
        .slice(0, 3)
    : [];

  const handleSearchSubmit = (queryToSubmit?: string) => {
    const term = (queryToSubmit !== undefined ? queryToSubmit : searchQuery).trim();
    setSearchFocused(false);
    setSearchOpen(false);
    if (term) {
      navigate(`/catalogue?q=${encodeURIComponent(term)}`);
    } else {
      navigate(`/catalogue`);
    }
  };

  const handleSelectCategory = (catName: string) => {
    setCatOpen(false);
    setSearchFocused(false);
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/catalogue?category=${encodeURIComponent(catName)}`);
  };

  const handleSelectCourse = (course: CourseItem) => {
    setSearchFocused(false);
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/catalogue?q=${encodeURIComponent(course.title)}`);
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface-900 border-b border-white/10 text-white font-[Inter,sans-serif]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-2 lg:gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 mr-1 lg:mr-3 group">
          <img
            src="/images/logo%20exacademy.jpeg"
            alt="Logo"
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 group-hover:ring-accent-400 transition-all"
          />
          <span className="hidden sm:block text-sm font-extrabold whitespace-nowrap tracking-tight text-white">
            Excellence Académie
          </span>
        </Link>

        {/* Categories dropdown – desktop */}
        <div ref={catRef} className="hidden lg:block relative">
          <button
            onClick={() => setCatOpen(!catOpen)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg transition-all",
              catOpen
                ? "bg-white/15 text-white ring-1 ring-white/20"
                : "hover:bg-white/10 text-white/90"
            )}
          >
            <GraduationCap size={16} className="text-accent-400" />
            Catégories
            <ChevronDown
              size={14}
              className={cn("transition-transform duration-200", catOpen && "rotate-180")}
            />
          </button>
          <AnimatePresence>
            {catOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 bg-white text-surface-900 rounded-2xl shadow-2xl border border-gray-100 py-3 w-80 z-50 overflow-hidden"
              >
                <div className="px-4 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    Filières & Concours
                  </span>
                  <span className="text-[11px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                    {categories.length} domaines
                  </span>
                </div>

                <div className="max-h-[380px] overflow-y-auto px-1 space-y-1">
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleSelectCategory(c.name)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-primary-50 hover:text-primary-800 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color || "#D97706" }}
                        />
                        <span className="font-semibold truncate text-gray-800 group-hover:text-primary-700">
                          {c.name}
                        </span>
                      </div>
                      {c.coursesCount !== undefined && c.coursesCount > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 group-hover:bg-primary-100 group-hover:text-primary-700 text-gray-500 shrink-0">
                          {c.coursesCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100 px-3">
                  <Link
                    to="/catalogue"
                    onClick={() => setCatOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <span>Consulter tout le catalogue</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search bar – desktop */}
        <div ref={searchContainerRef} className="hidden lg:flex flex-1 max-w-md xl:max-w-lg mx-3 xl:mx-6 relative">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher un concours, une formation..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                } else if (e.key === "Escape") {
                  setSearchFocused(false);
                }
              }}
              className="w-full h-10 pl-10 pr-9 bg-white text-surface-900 text-sm font-medium rounded-full border border-surface-300 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 placeholder:text-surface-400 shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown – Desktop */}
          <AnimatePresence>
            {searchFocused && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white text-surface-900 rounded-2xl shadow-2xl border border-gray-200 py-3 z-50 overflow-hidden"
              >
                {/* 1. Si champ vide : Recherches fréquentes */}
                {!qTrim && (
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <TrendingUp size={13} className="text-accent-500" />
                      <span>Recherches populaires</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SEARCHES.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setSearchQuery(tag);
                            handleSearchSubmit(tag);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 hover:bg-accent-50 hover:text-accent-600 text-gray-700 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Résultats si texte saisi */}
                {qTrim && (
                  <div className="space-y-3">
                    {/* Catégories correspondantes */}
                    {filteredCategories.length > 0 && (
                      <div className="px-3">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                          <Tag size={12} />
                          <span>Catégories</span>
                        </div>
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => handleSelectCategory(cat.name)}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold hover:bg-accent-50 hover:text-accent-700 text-gray-800 transition-colors flex items-center justify-between"
                          >
                            <span className="truncate">{cat.name}</span>
                            <span className="text-xs text-gray-400 font-normal">
                              {cat.coursesCount || 0} cours
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Formations correspondantes */}
                    {filteredCourses.length > 0 && (
                      <div className="px-3">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                          <BookOpen size={12} />
                          <span>Formations ({filteredCourses.length})</span>
                        </div>
                        {filteredCourses.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCourse(c)}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-between group"
                          >
                            <div className="truncate mr-3">
                              <p className="text-sm font-bold text-gray-900 group-hover:text-primary-700 truncate">
                                {c.title}
                              </p>
                              {c.category && (
                                <p className="text-[11px] text-gray-400 truncate">
                                  {c.category}
                                </p>
                              )}
                            </div>
                            {c.monthlyFee ? (
                              <span className="text-xs font-black text-accent-600 shrink-0 bg-accent-50 px-2 py-0.5 rounded-md">
                                {Number(c.monthlyFee).toLocaleString("fr-FR")} F/m
                              </span>
                            ) : (
                              <ArrowRight
                                size={14}
                                className="text-gray-300 group-hover:text-primary-600 shrink-0"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Aucun résultat */}
                    {filteredCourses.length === 0 && filteredCategories.length === 0 && (
                      <div className="px-4 py-4 text-center">
                        <p className="text-sm text-gray-500 font-medium">
                          Aucun résultat immédiat pour « <strong className="text-gray-800">{searchQuery}</strong> »
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Appuyez sur Entrée pour lancer une recherche complète dans le catalogue.
                        </p>
                      </div>
                    )}

                    {/* Footer bouton voir tous */}
                    <div className="pt-2 border-t border-gray-100 px-3">
                      <button
                        type="button"
                        onClick={() => handleSearchSubmit()}
                        className="w-full py-2 px-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Voir tous les résultats pour « {searchQuery} »</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spacer */}
        <div className="flex-1 lg:hidden" />

        {/* Right actions – desktop */}
        <div className="hidden lg:flex items-center gap-1 ml-auto shrink-0">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="px-3 py-1.5 text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {/* Phone – only on xl */}
          <a
            href="tel:0747439443"
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/10 transition-colors"
            title="Appeler"
          >
            <Phone size={14} />
            <span className="whitespace-nowrap">07 47 43 94 43</span>
          </a>

          {/* Cart */}
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Panier"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-[10px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* Connexion / Icône Utilisateur Connecté */}
          {currentUser ? (
            <Link
              to={getDashboardUrl(currentUser)}
              className="relative group p-0.5 rounded-full ring-2 ring-emerald-500/60 hover:ring-emerald-400 transition-all flex items-center justify-center shrink-0"
              title={`Connecté : ${currentUser.name || "Compte"} — Cliquer pour accéder au tableau de bord`}
              aria-label="Tableau de bord utilisateur connecté"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-700 via-primary-600 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              {/* Online indicator dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-surface-900 rounded-full shadow-xs ring-1 ring-emerald-300" />
            </Link>
          ) : (
            <>
              <Link
                to="/student/login"
                className="h-10 px-4 text-sm font-bold border border-white/30 rounded-lg hover:bg-white/10 transition-colors flex items-center"
              >
                Connexion
              </Link>
              <Link
                to="/students/new"
                className="h-10 px-4 text-sm font-bold bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center shadow-md shadow-accent-500/20"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>

        {/* Mobile icons */}
        <div className="flex items-center gap-0.5 lg:hidden">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Rechercher"
          >
            <Search size={20} />
          </button>
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Panier"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-accent-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </button>
          <Link
            to={getDashboardUrl(currentUser)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
            aria-label={currentUser ? "Mon Espace" : "Connexion"}
          >
            <User size={20} />
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? "Fermer" : "Menu"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-surface-900 border-t border-white/10 overflow-hidden"
          >
            <div ref={mobileSearchContainerRef} className="px-4 py-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Rechercher une formation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 bg-white text-surface-900 text-sm font-medium rounded-full border border-surface-300 focus:outline-none focus:border-accent-500 placeholder:text-surface-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Suggestions mobile */}
              {qTrim && (
                <div className="mt-2 bg-white text-surface-900 rounded-xl p-2 shadow-lg max-h-60 overflow-y-auto space-y-1">
                  {filteredCourses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCourse(c)}
                      className="w-full text-left p-2 rounded-lg hover:bg-primary-50 text-xs font-semibold text-gray-800 flex justify-between items-center"
                    >
                      <span className="truncate">{c.title}</span>
                      <ArrowRight size={12} className="text-gray-400 shrink-0 ml-2" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="w-full text-center py-2 text-xs font-bold text-primary-600 border-t border-gray-100 mt-1"
                  >
                    Voir tous les résultats →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-surface-900 border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {currentUser ? (
                <Link
                  to={getDashboardUrl(currentUser)}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-primary-700 to-primary-600 border border-emerald-500/40 text-white font-bold rounded-xl shadow-md mb-3"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white text-xs font-black">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={15} />}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-surface-900 rounded-full" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-300">Session active • Tableau de bord</span>
                </Link>
              ) : (
                <Link
                  to="/students/new"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center py-3 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 transition-colors mb-3 shadow-md"
                >
                  S'inscrire maintenant
                </Link>
              )}
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 px-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {l.label}
                </Link>
              ))}

              {/* Dynamic categories mobile */}
              <div className="border-t border-white/10 pt-3 mt-2">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2 px-3">
                  Catégories & Concours
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectCategory(c.name)}
                      className="w-full text-left py-2 px-3 text-sm text-white/80 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <span>{c.name}</span>
                      {c.coursesCount !== undefined && c.coursesCount > 0 && (
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                          {c.coursesCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 mt-2 grid grid-cols-2 gap-2">
                <Link
                  to={getDashboardUrl(currentUser)}
                  onClick={() => setMenuOpen(false)}
                  className="text-center py-2.5 text-sm font-bold border border-white/20 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  {currentUser ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <User size={15} />
                    </>
                  ) : (
                    "Connexion"
                  )}
                </Link>
                <a
                  href="tel:0747439443"
                  className="text-center py-2.5 text-sm font-bold border border-white/20 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={14} /> 07 47 43 94 43
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
