import { useState, useEffect } from "react";
import {
  Home, Eye, LayoutGrid, BarChart3, Phone, Loader2, Save,
  RotateCcw, CheckCircle, X, Plus, GraduationCap, BookOpen,
  List, Settings2, Grip
} from "lucide-react";
import { fetchSiteConfigAdmin, updateSiteConfig } from "../../utils/api";
import { DEFAULT_SITE_CONFIG, mergeSiteConfig } from "../../constants/siteConfig";
import { useToast } from "../Toast";

const TABS = [
  { id: 'hero',       label: 'Accueil',        icon: <Home size={15} /> },
  { id: 'visibility', label: 'Visibilité',      icon: <Eye size={15} /> },
  { id: 'sections',   label: 'Titres & Textes', icon: <LayoutGrid size={15} /> },
  { id: 'stats',      label: 'Statistiques',   icon: <BarChart3 size={15} /> },
  { id: 'how',        label: 'Étapes',          icon: <List size={15} /> },
  { id: 'atouts',     label: 'Atouts',          icon: <Settings2 size={15} /> },
  { id: 'tarifs',     label: 'Tarifs',          icon: <Grip size={15} /> },
  { id: 'cta',        label: 'CTA Final',       icon: <Phone size={15} /> },
  { id: 'catalogue',  label: 'Catalogue',       icon: <BookOpen size={15} /> },
] as const;

const SECTION_LABELS: Record<string, string> = {
  actualite:    'Actualités (Bannières)',
  how:          'Comment ça marche ?',
  atouts:       'Pourquoi nous',
  admis:        'Lauréats & Admis',
  formations:   'Formations',
  tarifs:       'Tarifs & Inscription',
  testimonials: 'Avis / Témoignages',
};

const ICON_OPTIONS = [
  { value: 'magistrature', label: 'Magistrature (marteau)' },
  { value: 'ena',          label: 'ENA (bâtiment)' },
  { value: 'cities',       label: 'Villes (épingle)' },
  { value: 'online',       label: 'En ligne (globe)' },
  { value: 'trophy',       label: 'Trophée' },
  { value: 'users',        label: 'Personnes' },
  { value: 'award',        label: 'Récompense' },
  { value: 'star',         label: 'Étoile' },
];

const ATOUT_ICON_OPTIONS = [
  { value: 'trophy',  label: 'Trophée' },
  { value: 'users',   label: 'Équipe' },
  { value: 'mappin',  label: 'Localisation' },
  { value: 'globe',   label: 'Globe' },
  { value: 'award',   label: 'Récompense' },
  { value: 'shield',  label: 'Bouclier' },
  { value: 'star',    label: 'Étoile' },
  { value: 'zap',     label: 'Éclair' },
];

const ATOUT_COLOR_OPTIONS = [
  { value: 'from-yellow-500 to-orange-500',   label: 'Or' },
  { value: 'from-primary-500 to-primary-600', label: 'Bleu primaire' },
  { value: 'from-green-500 to-emerald-500',   label: 'Vert' },
  { value: 'from-primary-600 to-accent-500',  label: 'Bleu-accent' },
  { value: 'from-purple-500 to-purple-600',   label: 'Violet' },
  { value: 'from-red-500 to-rose-500',        label: 'Rouge' },
  { value: 'from-teal-500 to-cyan-500',       label: 'Turquoise' },
];

const inputCls = "w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:outline-none transition-colors";
const selectCls = inputCls + " bg-white";

function Field({
  label, value, onChange, textarea, placeholder, hint
}: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {textarea ? (
        <textarea rows={3} className={inputCls} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" className={inputCls} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
        title={enabled ? 'Actif' : 'Inactif'}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <span className={`text-xs font-semibold ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
        {enabled ? 'Affiché' : 'Masqué'}
      </span>
    </div>
  );
}

type Config = ReturnType<typeof mergeSiteConfig>;

interface SiteConfigViewProps {
  initialTab?: string;
}

export default function SiteConfigView({ initialTab }: SiteConfigViewProps = {}) {
  const [tab, setTab] = useState<string>(() => initialTab || 'hero');
  const [config, setConfig] = useState<Config>(() => mergeSiteConfig(DEFAULT_SITE_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchSiteConfigAdmin()
      .then((data) => setConfig(mergeSiteConfig(data?.content)))
      .catch(() => toast('error', 'Impossible de charger la configuration actuelle'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (updates: Partial<Config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setDirty(true);
  };

  const patchSection = (key: keyof Config, field: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: { ...(prev[key] as any), [field]: value } }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteConfig(config);
      setDirty(false);
      toast('success', '✅ Configuration enregistrée et appliquée sur le site.');
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={30} className="text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header sticky */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
        <div>
          <h2 className="font-black text-gray-900 text-lg">Paramètres du site</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Toutes les modifications sont enregistrées en base et appliquées immédiatement sur le site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setConfig(mergeSiteConfig(DEFAULT_SITE_CONFIG)); setDirty(true); }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-surface-50 transition-colors border border-gray-200"
          >
            <RotateCcw size={15} /> Valeurs par défaut
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex flex-wrap gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {t.icon} {t.label}
            {dirty && ['hero', 'cta', 'stats'].includes(t.id) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* ═══ HERO ═══ */}
      {tab === 'hero' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Section Héro (haut de page)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Le grand bandeau d'accueil avec titre, sous-titre et boutons.</p>
            </div>
            <Toggle enabled={config.hero.enabled !== false} onChange={(v) => patchSection('hero', 'enabled', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Badge" value={config.hero.badge} onChange={(v) => patchSection('hero', 'badge', v)} placeholder="Ex: L'école de référence en CI" />
            <Field label="Titre — ligne 1" value={config.hero.titleLine1} onChange={(v) => patchSection('hero', 'titleLine1', v)} />
            <Field label="Titre — mot accentué (couleur)" value={config.hero.titleHighlight} onChange={(v) => patchSection('hero', 'titleHighlight', v)} />
            <Field label="Titre — fin" value={config.hero.titleLine2} onChange={(v) => patchSection('hero', 'titleLine2', v)} />
            <div className="sm:col-span-2">
              <Field label="Sous-titre" value={config.hero.subtitle} onChange={(v) => patchSection('hero', 'subtitle', v)} textarea />
            </div>
            <Field label="Bouton principal" value={config.hero.ctaPrimary} onChange={(v) => patchSection('hero', 'ctaPrimary', v)} />
            <Field label="Bouton secondaire" value={config.hero.ctaSecondary} onChange={(v) => patchSection('hero', 'ctaSecondary', v)} />
          </div>
          <hr className="border-gray-100" />
          <h4 className="font-semibold text-gray-700 text-sm">Pastilles flottantes</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre d'étudiants formés" value={config.hero.heroStudentsCount} onChange={(v) => patchSection('hero', 'heroStudentsCount', v)} placeholder="Ex: 1000+" />
            <Field label="Note avis (ex: 4.8/5)" value={config.hero.heroRating} onChange={(v) => patchSection('hero', 'heroRating', v)} placeholder="Ex: 4.8/5" />
            <Field label="Label admis (floating card)" value={config.hero.heroAdmisLabel} onChange={(v) => patchSection('hero', 'heroAdmisLabel', v)} placeholder="Ex: 13 Admis" />
            <Field label="Concours (floating card)" value={config.hero.heroAdmisConcours} onChange={(v) => patchSection('hero', 'heroAdmisConcours', v)} placeholder="Ex: Magistrature 2026" />
            <Field label="Taux de réussite (floating card)" value={config.hero.heroTauxReussite} onChange={(v) => patchSection('hero', 'heroTauxReussite', v)} placeholder="Ex: 65%" />
          </div>
        </div>
      )}

      {/* ═══ VISIBILITY ═══ */}
      {tab === 'visibility' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-1">
          <h3 className="font-bold text-gray-900 mb-1">Affichage des sections</h3>
          <p className="text-xs text-gray-400 mb-4">Activez ou désactivez chaque section. Les blocs désactivés disparaissent complètement du site.</p>
          <div className="divide-y divide-gray-50">
            {[
              { key: 'hero',        label: 'Hero (bannière principale)' },
              { key: 'stats',       label: 'Bandeau Statistiques' },
              { key: 'actualite',   label: 'Actualités (Bannières À la une)' },
              { key: 'how',         label: 'Comment ça marche ?' },
              { key: 'atouts',      label: 'Pourquoi nous (Atouts)' },
              { key: 'admis',       label: 'Lauréats & Admis' },
              { key: 'formations',  label: 'Nos Formations' },
              { key: 'tarifs',      label: 'Tarifs & Inscription' },
              { key: 'testimonials',label: 'Témoignages / Avis' },
              { key: 'cta',         label: 'CTA Final (Appel à l\'action)' },
              { key: 'catalogue',   label: 'Page Catalogue (lien dans la navbar)' },
            ].map(({ key, label }) => (
              <div key={key} className="py-3.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <Toggle
                  enabled={(config as any)[key]?.enabled !== false}
                  onChange={(v) => patchSection(key as any, 'enabled', v)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTIONS (titres & sous-titres) ═══ */}
      {tab === 'sections' && (
        <div className="space-y-4">
          {Object.keys(SECTION_LABELS).map(key => {
            const sec = (config as any)[key] || {};
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h3 className="font-bold text-gray-900 text-sm">{SECTION_LABELS[key]}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Titre" value={sec.title || ''} onChange={(v) => patchSection(key as any, 'title', v)} />
                  <Field label="Sous-titre" value={sec.subtitle || ''} onChange={(v) => patchSection(key as any, 'subtitle', v)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ STATS ═══ */}
      {tab === 'stats' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Statistiques (bandeau chiffres)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Les chiffres clés affichés sous le hero. Ex : "13+ Admis Magistrature".</p>
            </div>
            <Toggle enabled={config.stats.enabled !== false} onChange={(v) => patchSection('stats', 'enabled', v)} />
          </div>

          <div className="space-y-3">
            {config.stats.items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-black text-xs shrink-0 mt-1">{i + 1}</div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    className={inputCls}
                    value={item.number}
                    placeholder="Chiffre (ex: 13+)"
                    onChange={(e) => {
                      const items = config.stats.items.map((it, j) => j === i ? { ...it, number: e.target.value } : it);
                      patchSection('stats', 'items', items);
                    }}
                  />
                  <input
                    type="text"
                    className={inputCls}
                    value={item.label}
                    placeholder="Libellé (ex: Admis Magistrature)"
                    onChange={(e) => {
                      const items = config.stats.items.map((it, j) => j === i ? { ...it, label: e.target.value } : it);
                      patchSection('stats', 'items', items);
                    }}
                  />
                  <select
                    className={selectCls}
                    value={item.icon || 'online'}
                    onChange={(e) => {
                      const items = config.stats.items.map((it, j) => j === i ? { ...it, icon: e.target.value } : it);
                      patchSection('stats', 'items', items);
                    }}
                  >
                    {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => patchSection('stats', 'items', config.stats.items.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  title="Supprimer"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => patchSection('stats', 'items', [...config.stats.items, { number: '', label: '', icon: 'online' }])}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Ajouter une statistique
          </button>
        </div>
      )}

      {/* ═══ HOW (étapes) ═══ */}
      {tab === 'how' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Comment ça marche ? (étapes)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Les 4 étapes du parcours étudiant.</p>
            </div>
            <Toggle enabled={config.how.enabled !== false} onChange={(v) => patchSection('how', 'enabled', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Titre de la section" value={config.how.title} onChange={(v) => patchSection('how', 'title', v)} />
            <Field label="Sous-titre" value={config.how.subtitle} onChange={(v) => patchSection('how', 'subtitle', v)} />
          </div>
          <h4 className="font-semibold text-gray-700 text-sm mt-2">Étapes</h4>
          <div className="space-y-3">
            {config.how.steps.map((step, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => patchSection('how', 'steps', config.how.steps.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  className={inputCls}
                  value={step.title}
                  placeholder="Titre de l'étape"
                  onChange={(e) => {
                    const steps = config.how.steps.map((s, j) => j === i ? { ...s, title: e.target.value } : s);
                    patchSection('how', 'steps', steps);
                  }}
                />
                <textarea
                  rows={2}
                  className={inputCls}
                  value={step.desc}
                  placeholder="Description de l'étape"
                  onChange={(e) => {
                    const steps = config.how.steps.map((s, j) => j === i ? { ...s, desc: e.target.value } : s);
                    patchSection('how', 'steps', steps);
                  }}
                />
              </div>
            ))}
          </div>
          {config.how.steps.length < 6 && (
            <button
              type="button"
              onClick={() => patchSection('how', 'steps', [...config.how.steps, { title: '', desc: '' }])}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Ajouter une étape
            </button>
          )}
        </div>
      )}

      {/* ═══ ATOUTS ═══ */}
      {tab === 'atouts' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Atouts / Pourquoi nous</h3>
              <p className="text-xs text-gray-400 mt-0.5">Les arguments clés affichés en grille de cartes.</p>
            </div>
            <Toggle enabled={config.atouts.enabled !== false} onChange={(v) => patchSection('atouts', 'enabled', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Titre de la section" value={config.atouts.title} onChange={(v) => patchSection('atouts', 'title', v)} />
            <Field label="Sous-titre" value={config.atouts.subtitle} onChange={(v) => patchSection('atouts', 'subtitle', v)} />
          </div>
          <h4 className="font-semibold text-gray-700 text-sm mt-2">Cartes d'atouts</h4>
          <div className="space-y-3">
            {config.atouts.items.map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Atout {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => patchSection('atouts', 'items', config.atouts.items.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    className={inputCls}
                    value={item.title}
                    placeholder="Titre"
                    onChange={(e) => {
                      const items = config.atouts.items.map((it, j) => j === i ? { ...it, title: e.target.value } : it);
                      patchSection('atouts', 'items', items);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className={selectCls}
                      value={item.icon}
                      onChange={(e) => {
                        const items = config.atouts.items.map((it, j) => j === i ? { ...it, icon: e.target.value } : it);
                        patchSection('atouts', 'items', items);
                      }}
                    >
                      {ATOUT_ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                      className={selectCls}
                      value={item.color}
                      onChange={(e) => {
                        const items = config.atouts.items.map((it, j) => j === i ? { ...it, color: e.target.value } : it);
                        patchSection('atouts', 'items', items);
                      }}
                    >
                      {ATOUT_COLOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={item.desc}
                  placeholder="Description"
                  onChange={(e) => {
                    const items = config.atouts.items.map((it, j) => j === i ? { ...it, desc: e.target.value } : it);
                    patchSection('atouts', 'items', items);
                  }}
                />
              </div>
            ))}
          </div>
          {config.atouts.items.length < 8 && (
            <button
              type="button"
              onClick={() => patchSection('atouts', 'items', [...config.atouts.items, { title: '', desc: '', icon: 'trophy', color: 'from-yellow-500 to-orange-500' }])}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Ajouter un atout
            </button>
          )}
        </div>
      )}

      {/* ═══ TARIFS ═══ */}
      {tab === 'tarifs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-gray-900">Tarifs & Inscription</h3>
                <p className="text-xs text-gray-400 mt-0.5">Les montants affichés sur la page d'accueil.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    patchSection('tarifs', 'title', DEFAULT_SITE_CONFIG.tarifs.title);
                    patchSection('tarifs', 'subtitle', DEFAULT_SITE_CONFIG.tarifs.subtitle);
                    patchSection('tarifs', 'inscription', DEFAULT_SITE_CONFIG.tarifs.inscription);
                    patchSection('tarifs', 'mensualites', DEFAULT_SITE_CONFIG.tarifs.mensualites);
                    patchSection('tarifs', 'ctaLabel', DEFAULT_SITE_CONFIG.tarifs.ctaLabel);
                  }}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Rétablir les tarifs recommandés
                </button>
                <Toggle enabled={config.tarifs.enabled !== false} onChange={(v) => patchSection('tarifs', 'enabled', v)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Titre" value={config.tarifs.title} onChange={(v) => patchSection('tarifs', 'title', v)} />
              <Field label="Sous-titre" value={config.tarifs.subtitle} onChange={(v) => patchSection('tarifs', 'subtitle', v)} />
              <Field label="Label bouton CTA" value={config.tarifs.ctaLabel} onChange={(v) => patchSection('tarifs', 'ctaLabel', v)} placeholder="Ex: Rejoins-nous maintenant" />
            </div>
          </div>

          {/* Frais d'inscription */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Frais d'Inscription</h3>
            {(config.tarifs.inscription || []).map((ligne, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  className={inputCls}
                  value={ligne.label}
                  placeholder="Label (ex: Présentiel Abidjan)"
                  onChange={(e) => {
                    const inscription = config.tarifs.inscription.map((l, j) => j === i ? { ...l, label: e.target.value } : l);
                    patchSection('tarifs', 'inscription', inscription);
                  }}
                />
                <input
                  type="text"
                  className={inputCls}
                  value={ligne.value}
                  placeholder="Montant (ex: 45.000 F)"
                  onChange={(e) => {
                    const inscription = config.tarifs.inscription.map((l, j) => j === i ? { ...l, value: e.target.value } : l);
                    patchSection('tarifs', 'inscription', inscription);
                  }}
                />
                <button
                  type="button"
                  onClick={() => patchSection('tarifs', 'inscription', config.tarifs.inscription.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patchSection('tarifs', 'inscription', [...config.tarifs.inscription, { label: '', value: '' }])}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Ajouter une ligne
            </button>
          </div>

          {/* Mensualités */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Mensualités</h3>
            {(config.tarifs.mensualites || []).map((ligne, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  className={inputCls}
                  value={ligne.label}
                  placeholder="Label (ex: Présentiel Abidjan)"
                  onChange={(e) => {
                    const mensualites = config.tarifs.mensualites.map((l, j) => j === i ? { ...l, label: e.target.value } : l);
                    patchSection('tarifs', 'mensualites', mensualites);
                  }}
                />
                <input
                  type="text"
                  className={inputCls}
                  value={ligne.value}
                  placeholder="Montant (ex: 30.000 F/mois)"
                  onChange={(e) => {
                    const mensualites = config.tarifs.mensualites.map((l, j) => j === i ? { ...l, value: e.target.value } : l);
                    patchSection('tarifs', 'mensualites', mensualites);
                  }}
                />
                <button
                  type="button"
                  onClick={() => patchSection('tarifs', 'mensualites', config.tarifs.mensualites.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patchSection('tarifs', 'mensualites', [...config.tarifs.mensualites, { label: '', value: '' }])}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Ajouter une ligne
            </button>
          </div>
        </div>
      )}

      {/* ═══ CTA ═══ */}
      {tab === 'cta' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Section finale d'appel à l'action</h3>
              <p className="text-xs text-gray-400 mt-0.5">Le bloc coloré en bas de page pour inciter à l'inscription.</p>
            </div>
            <Toggle enabled={config.cta.enabled !== false} onChange={(v) => patchSection('cta', 'enabled', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Titre" value={config.cta.title} onChange={(v) => patchSection('cta', 'title', v)} /></div>
            <div className="sm:col-span-2"><Field label="Sous-titre" value={config.cta.subtitle} onChange={(v) => patchSection('cta', 'subtitle', v)} textarea /></div>
            <Field label="Numéro de téléphone conseiller" value={config.cta.phone} onChange={(v) => patchSection('cta', 'phone', v)} placeholder="Ex: 0747439443" hint="Laisser vide pour masquer le bouton d'appel" />
            <Field label="Bouton principal" value={config.cta.ctaPrimary} onChange={(v) => patchSection('cta', 'ctaPrimary', v)} />
            <Field label="Bouton secondaire" value={config.cta.ctaSecondary} onChange={(v) => patchSection('cta', 'ctaSecondary', v)} />
          </div>
        </div>
      )}

      {/* ═══ CATALOGUE ═══ */}
      {tab === 'catalogue' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Page Catalogue des formations</h3>
              <p className="text-xs text-gray-400 mt-0.5">Page publique accessible à /catalogue — liste toutes les formations.</p>
            </div>
            <Toggle enabled={config.catalogue.enabled !== false} onChange={(v) => patchSection('catalogue', 'enabled', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre de la page" value={config.catalogue.title} onChange={(v) => patchSection('catalogue', 'title', v)} />
            <Field label="Sous-titre" value={config.catalogue.subtitle} onChange={(v) => patchSection('catalogue', 'subtitle', v)} />
            <Field label="Label bouton d'inscription" value={config.catalogue.ctaLabel} onChange={(v) => patchSection('catalogue', 'ctaLabel', v)} placeholder="Ex: S'inscrire à cette formation" />
            <div className="flex items-center gap-3 mt-2">
              <Toggle
                enabled={config.catalogue.showPrices !== false}
                onChange={(v) => patchSection('catalogue', 'showPrices', v)}
                label="Afficher les prix"
              />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
            💡 Les formations affichées sur le catalogue sont celles créées dans <strong>Formations</strong>. Pour ajouter ou modifier des formations, allez dans le menu <strong>Formations</strong> du tableau de bord.
          </div>
        </div>
      )}

      {/* Dirty banner */}
      {dirty && (
        <div className="flex items-center gap-2 px-4 py-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          <CheckCircle size={16} className="shrink-0" />
          Modifications non enregistrées — cliquez sur <strong>Enregistrer</strong> pour les appliquer sur le site.
        </div>
      )}
    </div>
  );
}