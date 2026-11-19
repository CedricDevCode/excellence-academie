import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { subscribeBlogAlerts } from "../utils/api";
import { useCookies } from "./CookieConsent";

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Footer() {
  const cookies = useCookies();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [startedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const normalized = email.trim();
    if (!EMAIL_RE.test(normalized)) {
      setStatus("error");
      setMessage("Saisissez une adresse email valide.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      await subscribeBlogAlerts(normalized, { _hp: website, _ts: startedAt });
      setStatus("success");
      setMessage("Merci ! Vous recevrez nos alertes concours.");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Inscription impossible pour le moment.");
    }
  };

  return (
    <footer className="bg-surface-900 text-white/80 text-sm font-sans">
      {/* Top – links */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 mb-2 lg:mb-0">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src="/images/logo%20exacademy.jpeg"
                alt="Logo Excellence Académie"
                width={36}
                height={36}
                loading="lazy"
                decoding="async"
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
              />
              <span className="font-extrabold text-white text-sm tracking-tight whitespace-nowrap">Excellence Académie</span>
            </Link>
            <p className="text-xs leading-relaxed text-white/70 max-w-[240px]">
              L'école préparatoire de référence pour les concours administratifs en Côte d'Ivoire.
            </p>
          </div>

          {/* Formations */}
          <nav aria-label="Formations">
            <h2 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Formations</h2>
            <ul className="space-y-2">
              {["Magistrature", "ENA (Tous cycles)", "Greffe & Notariat", "Sécurité & Force Publique", "Informatique"].map((l) => (
                <li key={l}><a href="/#formations" className="hover:text-white transition-colors text-white/70">{l}</a></li>
              ))}
            </ul>
          </nav>

          {/* Liens */}
          <nav aria-label="Liens utiles">
            <h2 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Liens Utiles</h2>
            <ul className="space-y-2">
              <li><Link to="/student/login" className="hover:text-white transition-colors text-white/70">Espace Étudiant</Link></li>
              <li><Link to="/students/new" className="hover:text-white transition-colors text-white/70">Inscription</Link></li>
              <li><Link to="/shop" className="hover:text-white transition-colors text-white/70">Boutique</Link></li>
              <li><Link to="/catalogue" className="hover:text-white transition-colors text-white/70">Catalogue des formations</Link></li>
            </ul>
          </nav>

          {/* Légal */}
          <nav aria-label="Informations légales">
            <h2 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Informations</h2>
            <ul className="space-y-2">
              <li><Link to="/mentions-legales" className="hover:text-white transition-colors text-white/70">Mentions Légales</Link></li>
              <li><Link to="/politique-de-confidentialite" className="hover:text-white transition-colors text-white/70">Politique de Confidentialité</Link></li>
              <li><Link to="/cgu" className="hover:text-white transition-colors text-white/70">CGU / Conditions</Link></li>
              <li><Link to="/accessibilite" className="hover:text-white transition-colors text-white/70">Accessibilité</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => cookies?.openSettings()}
                  className="hover:text-white transition-colors text-white/70 text-left cursor-pointer"
                >
                  Gérer mes cookies
                </button>
              </li>
            </ul>
          </nav>

          {/* Contact + Newsletter */}
          <div>
            <h2 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Contact</h2>
            <p className="text-xs leading-relaxed text-white/70 mb-4">
              Abidjan, Cocody Angré<br />Terminus 81/82, RUE L162<br />
              <a href="tel:+2250747439443" className="hover:text-white transition-colors">07 47 43 94 43</a> · <a href="tel:+2250173800072" className="hover:text-white transition-colors">01 73 80 00 72</a>
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2" noValidate>
              <label htmlFor="footer-newsletter-email" className="sr-only">Votre adresse email</label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") { setStatus("idle"); setMessage(""); }
                }}
                placeholder="Votre email"
                required
                autoComplete="email"
                aria-invalid={status === "error"}
                aria-describedby="footer-newsletter-message"
                className="flex-1 min-w-0 h-10 px-3 bg-white/10 text-white text-xs rounded border border-white/20 placeholder:text-white/50 focus:outline-none focus:border-white/60 transition-colors"
              />
              {/* Honeypot anti-spam — invisible pour les humains */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute left-[-9999px] h-px w-px opacity-0"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-10 px-4 bg-white/15 text-white text-xs font-bold rounded hover:bg-white/25 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {status === "loading" ? <Loader2 size={14} className="animate-spin" aria-label="Envoi en cours" /> : "OK"}
              </button>
            </form>
            <p
              id="footer-newsletter-message"
              role="status"
              aria-live="polite"
              className={`text-xs mt-2 font-semibold ${status === "success" ? "text-accent-300" : status === "error" ? "text-red-300" : "text-transparent"}`}
            >
              {message || "\u00A0"}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/60">
          <div>© {new Date().getFullYear()} Excellence Académie SARL. Tous droits réservés.</div>
          <div>Capital social : 1 000 000 FCFA · RCCM : CI-ABJ-03-2025-B12-01298</div>
        </div>
      </div>
    </footer>
  );
}
