import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Check, Cookie, Settings, Shield, Target, X } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useCookies } from '../components/CookieConsent';

const categories = [
  {
    id: 'necessary' as const,
    label: 'Strictement nécessaires',
    description:
      "Indispensables au fonctionnement du site : session de connexion, sécurité, panier d'achat et préférences d'affichage.",
    icon: Shield,
  },
  {
    id: 'analytics' as const,
    label: 'Statistiques et analyse',
    description:
      "Mesure d'audience anonymisée (Google Analytics 4) pour comprendre les pages consultées et améliorer le site. Aucune donnée n'est utilisée à des fins publicitaires.",
    icon: BarChart3,
  },
  {
    id: 'marketing' as const,
    label: 'Marketing et publicité',
    description:
      "Cookies destinés à mesurer l'efficacité de nos campagnes et à vous proposer des contenus pertinents. Désactivés par défaut.",
    icon: Target,
  },
];

export default function PreferencesCookies() {
  const cookies = useCookies();

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <SEOHead
        title="Préférences de cookies"
        description="Gérez vos préférences de cookies sur le site d'Excellence Académie : cookies nécessaires, mesure d'audience et marketing."
        url="/preferences-cookies"
      />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gold-800 hover:text-gold-900 text-sm font-semibold mb-8 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
              <Cookie size={22} className="text-gold-800" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink-950">Préférences de cookies</h1>
          </div>
          <p className="text-surface-600 text-sm mb-8 leading-relaxed">
            Vous pouvez modifier vos choix à tout moment. Votre consentement est conservé pendant 13 mois maximum.
            Consultez notre{' '}
            <Link to="/politique-de-confidentialite" className="text-gold-800 font-semibold underline underline-offset-2">
              politique de confidentialité
            </Link>{' '}
            pour en savoir plus.
          </p>

          <div className="space-y-4">
            {categories.map((cat) => {
              const enabled = cookies?.preferences?.[cat.id] ?? cat.id === 'necessary';
              return (
                <div key={cat.id} className="flex items-start gap-4 p-4 rounded-xl border border-surface-200 bg-surface-50">
                  <cat.icon size={20} className="text-gold-800 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-ink-950 text-sm">{cat.label}</h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          enabled ? 'bg-accent-50 text-accent-800' : 'bg-surface-200 text-surface-700'
                        }`}
                      >
                        {enabled ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
                        {enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-600 mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={() => cookies?.openSettings()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gold-800 text-white text-sm font-bold rounded-lg hover:bg-gold-900 transition-colors cursor-pointer"
            >
              <Settings size={16} aria-hidden="true" />
              Modifier mes préférences
            </button>
            <Link
              to="/politique-de-confidentialite"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-surface-300 text-ink-900 text-sm font-bold rounded-lg hover:bg-surface-100 transition-colors"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
