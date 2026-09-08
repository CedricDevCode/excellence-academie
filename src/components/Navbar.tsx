import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ShoppingCart } from "lucide-react";
import { openCartDrawer } from "./CartDrawer";
import { readCart, getCartCount } from "../utils/cart";

const links = [
  { label: "Accueil", href: "#hero" },
  { label: "Actualité", href: "#actualite" },
  { label: "L'École", href: "#atouts" },
  { label: "Formations", href: "#formations" },
  { label: "Tarifs", href: "#tarifs" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-white py-3 border-b border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-3">
          <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-10 h-10 object-contain rounded-md border border-gray-100" />
          <div>
            <div className="font-bold text-[#002855] leading-none text-sm md:text-base">EXCELLENCE ACADÉMIE</div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Formation Concours</div>
          </div>
        </a>

        <div className="hidden lg:flex items-center gap-6">
          {links.map(l => (
            <a key={l.label} href={l.href} className="text-xs font-semibold text-gray-600 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <div className="text-right hidden xl:block mr-1">
            <div className="text-[9px] text-gray-400 uppercase font-bold">Appeler</div>
            <a href="tel:0747439443" className="text-[#FF6B00] font-bold text-xs">07 47 43 94 43</a>
          </div>

          {/* Dynamic Cart Button */}
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-xl text-gray-700 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors flex items-center gap-1.5 border border-transparent hover:border-orange-100"
            title="Mon panier"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>

          <Link to="/shop" className="px-3 py-1.5 text-xs font-bold rounded border border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-colors">
            Boutique
          </Link>
          <Link to="/student/login" className="px-3 py-1.5 text-xs font-bold rounded border border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white transition-colors">
            Espace Étudiant
          </Link>
          <Link to="/students/new" className="px-3 py-1.5 text-xs font-bold rounded bg-[#FF6B00] text-white hover:bg-[#e65c00] transition-colors">
            S'inscrire
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button
            onClick={openCartDrawer}
            className="relative p-2 text-gray-700 hover:text-[#FF6B00]"
            aria-label="Mon panier"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button className="text-gray-600 p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl absolute w-full left-0 top-full">
          <div className="px-4 py-2">
            {links.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-semibold text-gray-800 border-b border-gray-50">
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-4 pb-2">
              <a href="tel:0747439443" className="text-center py-2 text-sm font-bold text-[#FF6B00] bg-orange-50 rounded">Appeler le 07 47 43 94 43</a>
              <Link to="/shop" onClick={() => setMenuOpen(false)} className="text-center py-2 text-sm font-bold border border-[#FF6B00] text-[#FF6B00] rounded">Boutique</Link>
              <Link to="/student/login" onClick={() => setMenuOpen(false)} className="text-center py-2 text-sm font-bold border border-[#002855] text-[#002855] rounded">Espace Étudiant</Link>
              <Link to="/students/new" onClick={() => setMenuOpen(false)} className="text-center py-2 text-sm font-bold bg-[#FF6B00] text-white rounded">S'inscrire</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
