import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingCart, Phone, Sparkles, ChevronDown } from "lucide-react";
import { openCartDrawer } from "./CartDrawer";
import { readCart, getCartCount } from "../utils/cart";
import { cn } from "../utils/cn";

const links = [
  { label: "Accueil", href: "/#hero" },
  { label: "Actualité", href: "/#actualite" },
  { label: "L'École", href: "/#atouts" },
  { label: "Formations", href: "/#formations" },
  { label: "Tarifs", href: "/#tarifs" },
];

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const items = readCart();
      setCartCount(getCartCount(items));
    };
    updateCount();
    window.addEventListener("shopCartUpdated", updateCount);
    return () => window.removeEventListener("shopCartUpdated", updateCount);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 15);
      if (menuOpen) { setVisible(true); return; }
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 8) setVisible(false);
        else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 6) setVisible(true);
      } else { setVisible(true); }
      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      visible ? "translate-y-0" : "-translate-y-full",
      scrolled
        ? "bg-white/85 backdrop-blur-xl shadow-[0_4px_25px_-4px_rgba(0,40,85,0.08)] border-b border-gray-200/50 py-2"
        : "bg-white/95 backdrop-blur-sm border-b border-gray-100/80 py-2.5 sm:py-3"
    )}>
      <div className="max-w-7xl 2xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative shrink-0">
            <img
              src="/images/logo exacademy.jpeg"
              alt="Logo Excellence Académie"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg border border-gray-100 shadow-xs group-hover:scale-105 transition-transform duration-300"
            />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
            </span>
          </div>
          <div className="shrink-0">
            <div className="font-extrabold text-primary-700 tracking-tight leading-tight text-xs sm:text-sm md:text-base group-hover:text-accent-500 transition-colors duration-300 whitespace-nowrap">
              EXCELLENCE ACADÉMIE
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <span>Formation Concours</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span className="hidden sm:inline text-accent-500 font-semibold">En ligne & Présentiel</span>
            </div>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:text-accent-500 hover:bg-accent-50/70 transition-all duration-200 whitespace-nowrap tracking-wide"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <a href="tel:0747439443" className="hidden 2xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-50 hover:bg-accent-50 border border-gray-100 hover:border-accent-200 transition-all shrink-0" title="Appeler">
            <div className="w-6 h-6 rounded-full bg-accent-100 text-accent-500 flex items-center justify-center shrink-0">
              <Phone size={12} />
            </div>
            <div className="whitespace-nowrap">
              <div className="text-[8px] text-gray-400 uppercase font-black tracking-wider leading-none">Conseiller</div>
              <div className="text-primary-700 font-extrabold text-xs leading-tight">07 47 43 94 43</div>
            </div>
          </a>

          {/* Cart */}
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-lg text-gray-700 hover:text-accent-500 hover:bg-accent-50 transition-all duration-200 border border-transparent hover:border-accent-100 shrink-0"
            title="Panier"
            aria-label="Panier"
          >
            <ShoppingCart size={18} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-accent-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <Link to="/shop" className="px-3 py-1.5 text-xs font-bold rounded-lg text-gray-700 hover:text-accent-500 hover:bg-gray-100/60 transition-all whitespace-nowrap">
            Boutique
          </Link>

          <Link to="/student/login" className="px-3 py-1.5 text-xs font-bold rounded-lg border border-primary-700/20 text-primary-700 hover:bg-primary-700 hover:text-white transition-all shrink-0 whitespace-nowrap">
            Connexion
          </Link>

          <Link to="/students/new" className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-accent text-white hover:brightness-110 transition-all shadow-sm shadow-accent-500/20 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <Sparkles size={13} />
            <span>S'inscrire</span>
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link to="/students/new" className="hidden sm:inline-flex px-3 py-1.5 text-xs font-bold rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors shadow-2xs">
            S'inscrire
          </Link>

          <button onClick={openCartDrawer} className="relative p-2 rounded-lg text-gray-700 hover:text-accent-500 hover:bg-gray-100/70 transition-colors" aria-label="Panier">
            <ShoppingCart size={20} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-accent-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            className="text-gray-700 p-2 rounded-lg hover:bg-gray-100/70 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fermer" : "Menu"}
          >
            <AnimatePresence mode="wait">
              {menuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X size={24} className="text-accent-500" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-gray-100 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 max-h-[85vh] overflow-y-auto">
              <div className="space-y-1 mb-4">
                {links.map((l, i) => (
                  <motion.a
                    key={l.label}
                    href={l.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-bold text-gray-800 hover:text-accent-500 hover:bg-accent-50/50 transition-colors"
                  >
                    <span>{l.label}</span>
                    <span className="text-gray-400 text-xs">→</span>
                  </motion.a>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 pt-3 border-t border-gray-100">
                <a href="tel:0747439443" className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-accent-500 bg-accent-50/80 border border-accent-200/50 rounded-xl">
                  <Phone size={15} />
                  <span>Appeler : 07 47 43 94 43</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <Link to="/shop" onClick={() => setMenuOpen(false)} className="text-center py-2.5 text-sm font-bold border border-gray-200 text-gray-800 hover:border-accent-500 rounded-xl bg-gray-50/50">Boutique</Link>
                  <Link to="/student/login" onClick={() => setMenuOpen(false)} className="text-center py-2.5 text-sm font-bold border border-primary-700 text-primary-700 hover:bg-primary-700 hover:text-white rounded-xl transition-colors">Connexion</Link>
                </div>

                <Link to="/students/new" onClick={() => setMenuOpen(false)} className="text-center py-3 text-sm font-bold bg-accent-500 text-white rounded-xl shadow-md hover:bg-accent-600 transition-colors flex items-center justify-center gap-2">
                  <Sparkles size={16} />
                  <span>S'inscrire maintenant</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
