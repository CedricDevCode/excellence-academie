import { useState } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-surface-900 text-white/70 text-sm font-[Inter,sans-serif]">
      {/* Top – links */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 mb-2 lg:mb-0">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/images/logo%20exacademy.jpeg" alt="Logo" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" />
              <span className="font-extrabold text-white text-sm tracking-tight whitespace-nowrap">Excellence Académie</span>
            </Link>
            <p className="text-xs leading-relaxed text-white/50 max-w-[240px]">
              L'école préparatoire de référence pour les concours administratifs en Côte d'Ivoire.
            </p>
          </div>

          {/* Formations */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Formations</h5>
            <ul className="space-y-2">
              {["Magistrature", "ENA (Tous cycles)", "Greffe & Notariat", "Sécurité & Force Publique", "Informatique"].map((l) => (
                <li key={l}><a href="/#formations" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Liens */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Liens Utiles</h5>
            <ul className="space-y-2">
              <li><Link to="/student/login" className="hover:text-white transition-colors">Espace Étudiant</Link></li>
              <li><Link to="/students/new" className="hover:text-white transition-colors">Inscription</Link></li>
              <li><Link to="/shop" className="hover:text-white transition-colors">Boutique</Link></li>
              <li><Link to="/catalogue" className="hover:text-white transition-colors">Catalogue des formations</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Informations</h5>
            <ul className="space-y-2">
              <li><Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions Légales</Link></li>
              <li><Link to="/politique-de-confidentialite" className="hover:text-white transition-colors">Politique de Confidentialité</Link></li>
              <li><Link to="/cgu" className="hover:text-white transition-colors">CGU</Link></li>
              <li><Link to="/accessibilite" className="hover:text-white transition-colors">Accessibilité</Link></li>
            </ul>
          </div>

          {/* Contact + Newsletter */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Contact</h5>
            <p className="text-xs leading-relaxed text-white/50 mb-4">
              Abidjan, Cocody Angré<br />Terminus 81/82, RUE L162<br />07 47 43 94 43 · 01 73 80 00 72
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required
                className="flex-1 min-w-0 h-9 px-3 bg-white/10 text-white text-xs rounded border border-white/10 placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors"
              />
              <button type="submit" className="h-9 px-4 bg-white/10 text-white text-xs font-bold rounded hover:bg-white/20 transition-colors shrink-0">
                OK
              </button>
            </form>
            {subscribed && <p className="text-accent-400 text-xs mt-2 font-semibold">Merci !</p>}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <div>© 2026 Excellence Académie SARL. Tous droits réservés.</div>
          <div>Capital social : 1 000 000 FCFA · RCCM : CI-ABJ-03-2025-B12-01298</div>
        </div>
      </div>
    </footer>
  );
}
