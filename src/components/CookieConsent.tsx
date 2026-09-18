import { useState, useEffect, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield, BarChart3, Target, Settings } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieContextType {
  preferences: CookiePreferences;
  showBanner: boolean;
  savePreferences: (prefs: CookiePreferences) => void;
  openSettings: () => void;
}

const CookieContext = createContext<CookieContextType | null>(null);

export function useCookies() {
  return useContext(CookieContext);
}

const STORAGE_KEY = 'exacademie_cookie_consent';

const defaultPrefs: CookiePreferences = { necessary: true, analytics: false, marketing: false };

function getStoredPrefs(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPrefs);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const stored = getStoredPrefs();
    if (stored) {
      setPreferences(stored);
    } else {
      setShowBanner(true);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    setPreferences(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    setShowSettings(false);
    applyPreferences(prefs);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const applyPreferences = (prefs: CookiePreferences) => {
    if (prefs.analytics) {
      if (!(window as any).gtag) {
        const s = document.createElement('script');
        s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
        s.async = true;
        document.head.appendChild(s);
      }
    }
  };

  return (
    <CookieContext.Provider value={{ preferences, showBanner: showBanner && !showSettings, savePreferences, openSettings }}>
      {children}
      {showBanner && <CookieBanner onSave={savePreferences} onSettings={() => { setShowBanner(false); setShowSettings(true); }} />}
      {showSettings && <CookieSettings preferences={preferences} onSave={savePreferences} onClose={() => setShowSettings(false)} />}
    </CookieContext.Provider>
  );
}

function CookieBanner({ onSave, onSettings }: { onSave: (p: CookiePreferences) => void; onSettings: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6" role="dialog" aria-label="Consentement cookies">
      <div className="max-w-2xl mx-auto bg-white rounded shadow-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-primary-100 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-[#c97e00]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Nous utilisons des cookies</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu.
              Vous pouvez personnaliser vos choix ou accepter tous les cookies.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => onSave({ necessary: true, analytics: true, marketing: true })}
                className="px-4 py-2 bg-[#c97e00] text-white text-xs font-bold rounded-lg hover:bg-[#7a4b00] transition-colors"
              >
                Tout accepter
              </button>
              <button
                onClick={() => onSave({ necessary: true, analytics: false, marketing: false })}
                className="px-4 py-2 bg-surface-50 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={onSettings}
                className="px-4 py-2 text-[#c97e00] text-xs font-bold rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5"
              >
                <Settings size={14} />
                Personnaliser
              </button>
            </div>
          </div>
        </div>
        <Link to="/politique-de-confidentialite" className="text-[10px] text-gray-400 hover:text-gray-600 mt-3 inline-block">
          Politique de confidentialité
        </Link>
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
      description: 'Indispensables au fonctionnement du site. Ne peuvent pas être désactivés.',
      icon: Shield,
      required: true,
    },
    {
      id: 'analytics' as const,
      label: 'Statistiques et analyse',
      description: 'Nous aident à comprendre comment vous utilisez le site pour l\'améliorer.',
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-label="Paramètres des cookies">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-gray-900">Paramètres des cookies</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-surface-50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded border border-gray-100">
              <cat.icon size={20} className="text-[#c97e00] shrink-0 mt-0.5" />
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
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c97e00] after:shadow-sm"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                {cat.required && <span className="text-[10px] text-gray-400 mt-1 inline-block">Toujours actif</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={() => onSave(localPrefs)}
            className="flex-1 px-4 py-2.5 bg-[#c97e00] text-white text-sm font-bold rounded-lg hover:bg-[#7a4b00] transition-colors"
          >
            Enregistrer mes choix
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-surface-50 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
