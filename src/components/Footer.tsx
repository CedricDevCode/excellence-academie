import { Link } from 'react-router-dom';
import { MapPin, Phone, Globe, ChevronRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-12 pb-6 text-xs">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-8 h-8 rounded bg-white p-0.5" />
            <h4 className="text-white font-bold uppercase text-sm">Excellence Académie</h4>
          </div>
          <p className="mb-4 pr-4 leading-relaxed text-gray-400">
            L'école préparatoire de référence pour les concours administratifs en Côte d'Ivoire. Nous mettons notre expertise au service de votre réussite.
          </p>
          <div className="flex gap-3">
            {[
              { name: "Facebook", url: "https://web.facebook.com/people/Excellence-Academie/61572602455517/", initial: "F" },
              { name: "LinkedIn", url: "https://www.linkedin.com/company/excellence-acad%C3%A9mie", initial: "L" },
              { name: "WhatsApp", url: "https://wa.me/2250747439443", initial: "W" },
            ].map((social, i) => (
              <a key={i} href={social.url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-[#FF6B00] hover:text-white transition-colors text-white font-bold text-[10px]"
                aria-label={social.name}>
                {social.initial}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-sm">Contacts</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <MapPin size={14} className="text-[#FF6B00] shrink-0" />
              <span>Abidjan, Cocody Angré<br />Terminus 81/82, RUE L162</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone size={14} className="text-[#FF6B00] shrink-0" />
              <span>07 47 43 94 43<br />01 73 80 00 72</span>
            </li>
            <li className="flex items-center gap-2">
              <Globe size={14} className="text-[#FF6B00] shrink-0" />
              <a href="https://www.exacademie.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">www.exacademie.com</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-sm">Liens Utiles</h4>
          <ul className="space-y-2">
            <li><Link to="/student/login" className="flex items-center gap-2 hover:text-[#FF6B00] transition-colors"><ChevronRight size={12} /> Espace Étudiant</Link></li>
            <li><Link to="/students/new" className="flex items-center gap-2 hover:text-[#FF6B00] transition-colors"><ChevronRight size={12} /> Inscription</Link></li>
            <li><a href="#formations" className="flex items-center gap-2 hover:text-[#FF6B00] transition-colors"><ChevronRight size={12} /> Nos Formations</a></li>
            <li><a href="#tarifs" className="flex items-center gap-2 hover:text-[#FF6B00] transition-colors"><ChevronRight size={12} /> Nos Tarifs</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-center md:text-left">
        <div>© 2026 Excellence Académie SARL. Tous droits réservés.</div>
        <div className="text-gray-500">Capital social : 1.000.000 FCFA | RCCM : CI-ABJ-03-2025-B12-01298</div>
      </div>
    </footer>
  );
}
