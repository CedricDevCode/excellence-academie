import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShoppingCart, Phone, Sparkles } from "lucide-react";
import { openCartDrawer } from "./CartDrawer";
import { readCart, getCartCount } from "../utils/cart";

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

  // Détection intelligente du scroll (Smart reveal on scroll up, auto-hide on scroll down)
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 15);

      if (menuOpen) {
        setVisible(true);
        return;
      }

      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 8) {
          // Défilement vers le bas : on masque en douceur pour libérer l'espace visuel
          setVisible(false);
        } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 6) {
          // Défilement vers le haut : on réaffiche immédiatement avec effet verre
          setVisible(true);
        }
      } else {
        setVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);

  // Fermer le menu mobile lors d'un changement d'URL
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform ${
        visible ? "translate-y-0" : "-translate-y-full"
      } ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-[0_4px_25px_-4px_rgba(0,40,85,0.08)] border-b border-gray-200/70 py-2 sm:py-2.5"
          : "bg-white/95 backdrop-blur-sm border-b border-gray-100/80 py-2.5 sm:py-3.5"
      }`}
    >
      <div className="max-w-7xl 2xl:max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo & Titre */}
        <a href="/#hero" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="relative">
            <img
              src="/images/logo exacademy.jpeg"
              alt="Logo Excellence Académie"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg border border-gray-100 shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B00]"></span>
            </span>
          </div>
          <div>
            <div className="font-extrabold text-[#002855] tracking-tight leading-tight text-xs sm:text-sm md:text-base group-hover:text-[#FF6B00] transition-colors">
              EXCELLENCE ACADÉMIE
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
              <span>Formation Concours</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span className="hidden sm:inline text-[#FF6B00] font-semibold">CI & Diaspora</span>
            </div>
          </div>
        </a>

        {/* Liens de navigation (Desktop & Grand écran) */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:text-[#FF6B00] hover:bg-orange-50/60 uppercase tracking-wide transition-all"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Actions & Boutons (Desktop & Grand écran) */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3">
          {/* Numéro de téléphone */}
          <a
            href="tel:0747439443"
            className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors text-right"
            title="Appeler notre équipe"
          >
            <div className="w-7 h-7 rounded-full bg-orange-100 text-[#FF6B00] flex items-center justify-center">
              <Phone size={13} />
            </div>
            <div className="text-left">
              <div className="text-[8px] text-gray-400 uppercase font-black tracking-wider">Conseiller</div>
              <div className="text-[#002855] font-extrabold text-xs">07 47 43 94 43</div>
            </div>
          </a>

          {/* Panier */}
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-xl text-gray-700 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors flex items-center justify-center border border-transparent hover:border-orange-100"
            title="Mon panier"
            aria-label="Mon panier"
          >
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          <Link
            to="/shop"
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-700 hover:border-[#FF6B00] hover:text-[#FF6B00] hover:bg-orange-50/40 transition-all shadow-2xs"
          >
            Boutique
          </Link>

          <Link
            to="/student/login"
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#002855]/20 text-[#002855] hover:bg-[#002855] hover:text-white transition-all shadow-2xs"
          >
            Espace Étudiant
          </Link>

          <Link
            to="/students/new"
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#FF6B00] text-white hover:bg-[#e65c00] transition-all shadow-sm hover:shadow-orange-500/25 flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            <span>S'inscrire</span>
          </Link>
        </div>

        {/* Commandes Mobile & Tablette */}
        <div className="flex items-center gap-1.5 lg:hidden">
          {/* Raccourci Inscription visible sur tablette (sm à lg) */}
          <Link
            to="/students/new"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF6B00] text-white hover:bg-[#e65c00] transition-colors shadow-2xs"
          >
            S'inscrire
          </Link>

          {/* Bouton Panier Mobile/Tablette */}
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-lg text-gray-700 hover:text-[#FF6B00] hover:bg-gray-100/70 transition-colors"
            aria-label="Mon panier"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Bouton Hamburger */}
          <button
            className="text-gray-700 p-2 rounded-lg hover:bg-gray-100/70 transition-colors focus:outline-hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {menuOpen ? <X size={24} className="text-[#FF6B00]" /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menu Déroulant Mobile & Tablette avec animation fluide et fond flouté */}
      {menuOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-gray-100 shadow-2xl absolute w-full left-0 top-full transition-all animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-5 py-4 max-h-[85vh] overflow-y-auto">
            {/* Liens de navigation */}
            <div className="space-y-1 mb-4">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-bold text-gray-800 hover:text-[#FF6B00] hover:bg-orange-50/50 transition-colors"
                >
                  <span>{l.label}</span>
                  <span className="text-gray-400 text-xs">→</span>
                </a>
              ))}
            </div>

            {/* Boutons d'actions */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-gray-100">
              <a
                href="tel:0747439443"
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-[#FF6B00] bg-orange-50/80 border border-orange-200/50 rounded-xl"
              >
                <Phone size={15} />
                <span>Appeler : 07 47 43 94 43</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/shop"
                  onClick={() => setMenuOpen(false)}
                  className="text-center py-2.5 text-sm font-bold border border-gray-200 text-gray-800 hover:border-[#FF6B00] rounded-xl bg-gray-50/50"
                >
                  Boutique
                </Link>
                <Link
                  to="/student/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-center py-2.5 text-sm font-bold border border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white rounded-xl transition-colors"
                >
                  Espace Étudiant
                </Link>
              </div>

              <Link
                to="/students/new"
                onClick={() => setMenuOpen(false)}
                className="text-center py-3 text-sm font-bold bg-[#FF6B00] text-white rounded-xl shadow-md hover:bg-[#e65c00] transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>S'inscrire maintenant</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
