import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Home, Phone, ShoppingBag } from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-gradient-hero relative overflow-hidden flex items-center">
      <SEOHead
        title="Page introuvable (404)"
        description="La page que vous recherchez n'existe pas ou a été déplacée. Retrouvez les formations, la boutique et les actualités d'Excellence Académie."
        url="/404"
        noindex
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-16 right-10 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gold-400 font-black tracking-[0.3em] text-xs uppercase mb-4">Erreur 404</p>
        <h1 className="font-display text-6xl sm:text-8xl font-black text-white leading-none mb-6">
          4<span className="text-gold-500">0</span>4
        </h1>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Cette page est introuvable</h2>
        <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed">
          Le lien est peut-être obsolète ou l'adresse comporte une erreur. Voici les pages les plus utiles pour
          poursuivre votre préparation.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gold-500 text-ink-950 font-bold rounded-lg hover:bg-gold-400 transition-colors w-full sm:w-auto"
          >
            <Home size={18} aria-hidden="true" /> Retour à l'accueil
          </Link>
          <Link
            to="/catalogue"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-white/30 text-white font-bold rounded-lg hover:bg-white/10 transition-colors w-full sm:w-auto"
          >
            <Compass size={18} aria-hidden="true" /> Voir les formations
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 text-left">
          <Link to="/students/new" className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition-colors">
            <BookOpen size={20} className="text-gold-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold">S'inscrire</p>
              <p className="text-gray-400 text-xs">Rejoindre une formation</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <Link to="/shop" className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition-colors">
            <ShoppingBag size={20} className="text-gold-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold">Boutique</p>
              <p className="text-gray-400 text-xs">Livres et supports</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <a href="tel:+2250747439443" className="group flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition-colors">
            <Phone size={20} className="text-gold-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold">Nous appeler</p>
              <p className="text-gray-400 text-xs">07 47 43 94 43</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
