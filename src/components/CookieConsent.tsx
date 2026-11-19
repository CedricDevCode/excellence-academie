import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield, BarChart3, Target, Settings, Check } from 'lucide-react';
import { setAnalyticsConsent, trackEvent, trackPageview } from '../utils/analytics';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieContextType {
  preferences: CookiePreferences;
  showBanner: boolean;
  consentDecided: boolean;
  savePreferences: (prefs: CookiePreferences) => void;
  openSettings: () => void;
}

const CookieContext = createContext<CookieContextType | null>(null);

export function useCookies() {
  return useContext(CookieContext);
}

const STORAGE_KEY = 'exacademie_cookie_consent';
const CONSENT_VERSION = '2026-11';
const CONSENT_MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // 13 mois

const defaultPrefs: CookiePreferences = { necessary: true, analytics: false, marketing: false };

interface StoredConsent {
  version: string;
  savedAt: number;
  preferences: CookiePreferences;
}

function normalizePrefs(raw: any): CookiePreferences {
  return {
    necessary: true,
    analytics: Boolean(raw?.analytics),
    marketing: Boolean(raw?.marketing),
  };
}

function getStoredConsent(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Ancien format { necessary, analytics, marketing }
    if (parsed && typeof parsed.analytics === 'boolean') {
      return normalizePrefs(parsed);
    }

    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > CONSENT_MAX_AGE_MS) return null;

    return normalizePrefs(parsed.preferences);
  } catch {
    return null;
  }
}

function persistConsent(prefs: CookiePreferences) {
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    savedAt: Date.now(),
    preferences: prefs,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Stockage indisponible (navigation privée, quota) : on continue sans persister
  }
}

function applyPreferences(prefs: CookiePreferences) {
  setAnalyticsConsent(prefs.analytics);
  trackEvent('cookie_consent_update', {
    analytics: prefs.analytics,
    marketing: prefs.marketing,
  });
}

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPrefs);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consentDecided, setConsentDecided] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setPreferences(stored);
      setConsentDecided(true);
      applyPreferences(stored);
    } else {
      setShowBanner(true);
    }
  }, []);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    const normalized = normalizePrefs(prefs);
    setPreferences(normalized);
    setConsentDecided(true);
    persistConsent(normalized);
    setShowBanner(false);
    setShowSettings(false);
    applyPreferences(normalized);
    if (normalized.analytics) {
      trackPageview(`${window.location.pathname}${window.location.search}`);
    }
  }, []);

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  return (
    <CookieContext.Provider
      value={{ preferences, showBanner: showBanner && !showSettings, consentDecided, savePreferences, openSettings }}
    >
      {children}
      {showBanner && (
        <CookieBanner
          onSave={savePreferences}
          onSettings={() => {
            setShowBanner(false);
            setShowSettings(true);
          }}
        />
      )}
      {showSettings && (
        <CookieSettings
          preferences={preferences}
          onSave={savePreferences}
          onClose={() => setShowSettings(false)}
        />
      )}
    </CookieContext.Provider>
  );
}

function CookieBanner({ onSave, onSettings }: { onSave: (p: CookiePreferences) => void; onSettings: () => void }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6"
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-label="Consentement aux cookies"
    >
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-gold-800" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Nous utilisons des cookies</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Nous utilisons des cookies pour assurer le fonctionnement du site et, avec votre accord, mesurer
              l'audience afin d'améliorer votre expérience. Vous pouvez accepter, refuser ou personnaliser vos choix.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={() => onSave({ necessary: true, analytics: true, marketing: true })}
                className="px-4 py-2.5 bg-gold-800 text-white text-xs font-bold rounded-lg hover:bg-gold-900 transition-colors cursor-pointer"
              >
                Tout accepter
              </button>
              <button
                type="button"
                onClick={() => onSave({ necessary: true, analytics: false, marketing: false })}
                className="px-4 py-2.5 border-2 border-gray-300 text-gray-800 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={onSettings}
                className="px-4 py-2.5 text-gold-800 text-xs font-bold rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings size={14} aria-hidden="true" />
                Personnaliser
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <Link to="/politique-de-confidentialite" className="text-[11px] text-gray-600 hover:text-gray-900 underline underline-offset-2">
            Politique de confidentialité
          </Link>
          <Link to="/preferences-cookies" className="text-[11px] text-gray-600 hover:text-gray-900 underline underline-offset-2">
            Gérer mes cookies
          </Link>
        </div>
      </div>
    </div>
  );
}

function CookieSettings({ preferences, onSave, onClose }: { preferences: CookiePreferences; onSave: (p: CookiePreferences) => void; onClose: () => void }) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const categories = [
    {
      id: 'necessary' as const,
      label: 'Strictement nécessaires',
      description: 'Indispensables au fonctionnement du site (session, sécurité, panier). Ne peuvent pas être désactivés.',
      icon: Shield,
      required: true,
    },
    {
      id: 'analytics' as const,
      label: 'Statistiques et analyse',
      description: "Mesure d'audience anonymisée pour comprendre l'utilisation du site et l'améliorer.",
      icon: BarChart3,
      required: false,
    },
    {
      id: 'marketing' as const,
      label: 'Marketing et publicité',
      description: 'Utilisés pour vous proposer des contenus et publicités pertinents.',
      icon: Target,
      required: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Paramètres des cookies">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 sm:px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-gray-900">Paramètres des cookies</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les paramètres des cookies"
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <cat.icon size={20} className="text-gold-800 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-bold text-gray-900 text-sm">{cat.label}</h3>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={localPrefs[cat.id]}
                      disabled={cat.required}
                      onChange={(e) => setLocalPrefs({ ...localPrefs, [cat.id]: e.target.checked })}
                      className="sr-only peer"
                      aria-label={cat.label}
                    />
                    <div className="w-10 h-6 bg-gray-300 rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold-700 peer-checked:bg-gold-800 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-4 after:shadow-sm" />
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-1">{cat.description}</p>
                {cat.required && <span className="text-[11px] text-gray-600 mt-1 inline-flex items-center gap-1"><Check size={11} aria-hidden="true" /> Toujours actif</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={() => onSave(localPrefs)}
            className="flex-1 px-4 py-2.5 bg-gold-800 text-white text-sm font-bold rounded-lg hover:bg-gold-900 transition-colors cursor-pointer"
          >
            Enregistrer mes choix
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border-2 border-gray-300 text-gray-800 text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
