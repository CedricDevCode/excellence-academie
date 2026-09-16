import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Globe, ChevronRight, Send, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Container } from '../components/ui';

export default function Footer() {
  const { ref, isInView } = useScrollAnimation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-surface-900 text-gray-400 pt-16 pb-8 text-xs">
      <Container>
        <div ref={ref}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-12"
          >
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-lg bg-white p-0.5" />
                <h4 className="text-white font-extrabold uppercase text-sm tracking-tight">Excellence Académie</h4>
              </Link>
              <p className="mb-5 pr-4 leading-relaxed text-gray-400 text-sm">
                L'école préparatoire de référence pour les concours administratifs en Côte d'Ivoire.
              </p>
              <div className="flex gap-2.5">
                <a href="https://web.facebook.com/people/Excellence-Academie/61572602455517/" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-accent-500 hover:text-white transition-all border border-white/5 text-sm font-bold"
                  aria-label="Facebook">
                  F
                </a>
                <a href="https://www.linkedin.com/company/excellence-acad%C3%A9mie" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-primary-500 hover:text-white transition-all border border-white/5 text-sm font-bold"
                  aria-label="LinkedIn">
                  L
                </a>
                <a href="https://wa.me/2250747439443" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all border border-white/5"
                  aria-label="WhatsApp">
                  <MessageCircle size={16} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Formations</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Magistrature", href: "/#formations" },
                  { label: "ENA (Tous cycles)", href: "/#formations" },
                  { label: "Greffe & Notariat", href: "/#formations" },
                  { label: "Police & Sécurité", href: "/#formations" },
                  { label: "Informatique", href: "/#formations" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="flex items-center gap-2 hover:text-accent-500 transition-colors text-sm">
                      <ChevronRight size={12} className="text-accent-500" /> {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Liens Utiles</h4>
              <ul className="space-y-2.5">
                <li><Link to="/student/login" className="flex items-center gap-2 hover:text-accent-500 transition-colors text-sm"><ChevronRight size={12} className="text-accent-500" /> Espace Étudiant</Link></li>
                <li><Link to="/students/new" className="flex items-center gap-2 hover:text-accent-500 transition-colors text-sm"><ChevronRight size={12} className="text-accent-500" /> Inscription</Link></li>
                <li><Link to="/shop" className="flex items-center gap-2 hover:text-accent-500 transition-colors text-sm"><ChevronRight size={12} className="text-accent-500" /> Boutique</Link></li>
                <li><Link to="/blog" className="flex items-center gap-2 hover:text-accent-500 transition-colors text-sm"><ChevronRight size={12} className="text-accent-500" /> Blog</Link></li>
                <li><a href="#tarifs" className="flex items-center gap-2 hover:text-accent-500 transition-colors text-sm"><ChevronRight size={12} className="text-accent-500" /> Nos Tarifs</a></li>
              </ul>
            </div>

            {/* Contact + Newsletter */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Contact</h4>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-accent-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Abidjan, Cocody Angré<br />Terminus 81/82, RUE L162</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone size={14} className="text-accent-500 shrink-0 mt-0.5" />
                  <span className="text-sm">07 47 43 94 43<br />01 73 80 00 72</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe size={14} className="text-accent-500 shrink-0" />
                  <a href="https://www.exacademie.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">www.exacademie.com</a>
                </li>
              </ul>

              {/* Newsletter */}
              <h4 className="text-white font-bold mb-2.5 uppercase text-xs tracking-wider">Newsletter</h4>
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre email"
                  required
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent-500 transition-colors"
                />
                <button type="submit" className="px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors shrink-0">
                  <Send size={14} />
                </button>
              </form>
              {subscribed && (
                <p className="text-green-400 text-xs mt-2 font-semibold">Merci pour votre inscription !</p>
              )}
            </div>
          </motion.div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-center md:text-left">
            <div className="text-sm">© 2026 Excellence Académie SARL. Tous droits réservés.</div>
            <div className="text-gray-500 text-sm">Capital social : 1.000.000 FCFA | RCCM : CI-ABJ-03-2025-B12-01298</div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
