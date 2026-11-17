import { ReactNode } from "react";
import {
  User, Mail, Phone, Calendar, Globe, MapPin, Lock, BookOpen,
  Building2, Monitor, Layers, Sparkles, Check, ChevronDown,
} from "lucide-react";
import { MODES, VILLES, PAYS, Mode, calcRegistrationTotal, calcMonthlyTotal, formatPrice, isDiaspora, isAbidjan, courseRegistrationFee, courseMonthlyFee } from "../constants/student";

export interface StudentFormState {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  pays: string;
  ville: string;
  courseIds: string[];
  mode: Mode | '';
  coursParticuliers: boolean;
  dateNaissance: string;
}

interface StudentPersonalFieldsProps {
  form: StudentFormState;
  onChange: (field: keyof StudentFormState, value: any) => void;
  showPassword?: boolean;
  showDateNaissance?: boolean;
}

interface StudentProgramFieldsProps {
  form: StudentFormState;
  courses: {
    id: string;
    title: string;
    category?: string;
    price?: number;
    description?: string;
    registrationFee?: number;
    monthlyFee?: number;
    hasPresentiel?: boolean;
    hasOnline?: boolean;
  }[];
  onChange: (field: keyof StudentFormState, value: any) => void;
}

const inputCls =
  "w-full pl-11 pr-4 py-3 bg-surface-50/60 border border-surface-300 rounded text-sm text-surface-900 placeholder-surface-400 " +
  "focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all duration-150";

const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5";

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
      {children}
    </span>
  );
}

export function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded bg-primary-50 text-primary-700 flex items-center justify-center shrink-0 border border-primary-100">
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-black text-surface-800 uppercase tracking-[0.1em]">{title}</h3>
        {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function StudentPersonalFields({
  form,
  onChange,
  showPassword = true,
  showDateNaissance = true,
}: StudentPersonalFieldsProps) {
  return (
    <div className="space-y-5">
      {/* Identité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="reg-prenom">Prénom *</label>
          <div className="relative">
            <FieldIcon><User size={17} /></FieldIcon>
            <input
              id="reg-prenom"
              required
              autoComplete="given-name"
              value={form.prenom}
              onChange={(e) => onChange("prenom", e.target.value)}
              placeholder="Votre prénom"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="reg-nom">Nom *</label>
          <div className="relative">
            <FieldIcon><User size={17} /></FieldIcon>
            <input
              id="reg-nom"
              required
              autoComplete="family-name"
              value={form.nom}
              onChange={(e) => onChange("nom", e.target.value)}
              placeholder="Votre nom de famille"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Compte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="reg-email">Email *</label>
          <div className="relative">
            <FieldIcon><Mail size={17} /></FieldIcon>
            <input
              id="reg-email"
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="votre@email.com"
              className={inputCls}
            />
          </div>
        </div>
        {showPassword && (
          <div>
            <label className={labelCls} htmlFor="reg-password">Mot de passe *</label>
            <div className="relative">
              <FieldIcon><Lock size={17} /></FieldIcon>
              <input
                id="reg-password"
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => onChange("password", e.target.value)}
                placeholder="Au moins 8 caractères"
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="reg-telephone">Téléphone (WhatsApp) *</label>
          <div className="relative">
            <FieldIcon><Phone size={17} /></FieldIcon>
            <input
              id="reg-telephone"
              required
              type="tel"
              autoComplete="tel"
              value={form.telephone}
              onChange={(e) => onChange("telephone", e.target.value)}
              placeholder="07 XX XX XX XX"
              className={inputCls}
            />
          </div>
        </div>
        {showDateNaissance && (
          <div>
            <label className={labelCls} htmlFor="reg-birthdate">Date de naissance</label>
            <div className="relative">
              <FieldIcon><Calendar size={17} /></FieldIcon>
              <input
                id="reg-birthdate"
                type="date"
                value={form.dateNaissance}
                onChange={(e) => onChange("dateNaissance", e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Localisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="reg-pays">Pays *</label>
          <div className="relative">
            <FieldIcon><Globe size={17} /></FieldIcon>
            <select
              id="reg-pays"
              required
              value={form.pays}
              onChange={(e) => onChange("pays", e.target.value)}
              className={`${inputCls} appearance-none pr-10`}
            >
              <option value="">Sélectionnez votre pays…</option>
              {PAYS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="reg-ville">Ville / Centre *</label>
          <div className="relative">
            <FieldIcon><MapPin size={17} /></FieldIcon>
            <select
              id="reg-ville"
              required
              value={form.ville}
              onChange={(e) => onChange("ville", e.target.value)}
              className={`${inputCls} appearance-none pr-10`}
            >
              <option value="">Sélectionnez votre ville…</option>
              {VILLES.map((ville) => (
                <option key={ville} value={ville}>{ville}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

const MODE_ICONS: Record<string, ReactNode> = {
  presentiel: <Building2 size={20} />,
  en_ligne: <Monitor size={20} />,
  les_deux: <Layers size={20} />,
};

export function StudentProgramFields({ form, courses, onChange }: StudentProgramFieldsProps) {
  const selectedPays = form.pays;
  const diaspora = isDiaspora(selectedPays);

  const toggleCourse = (id: string) => {
    const next = form.courseIds.includes(id)
      ? form.courseIds.filter(c => c !== id)
      : [...form.courseIds, id];
    onChange("courseIds", next);
  };

  const selectedCourses = courses.filter((c) => form.courseIds.includes(c.id));
  const inscPrice = calcRegistrationTotal(selectedCourses, form.coursParticuliers, form.pays, form.ville);
  const monthlyAmount = calcMonthlyTotal(selectedCourses, form.coursParticuliers, form.pays, form.mode);

  const isInterieur = form.ville && !isAbidjan(form.ville);
  const categories = Array.from(new Set(courses.map(c => c.category || 'Autres formations')));

  return (
    <div className="space-y-6">
      {/* Indicateur de zone tarifaire */}
      {form.pays && (
        <div className={`p-3 rounded border flex items-center gap-3 ${
          diaspora
            ? "bg-accent-50 border-accent-200 text-accent-900"
            : isInterieur
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <span className="text-surface-400 shrink-0">
            <MapPin size={20} />
          </span>
          <div className="text-xs">
            <span className="font-bold block">
              {diaspora
                ? "Tarif Diaspora & International appliqué"
                : isInterieur
                ? "Tarif Intérieur de la Côte d'Ivoire appliqué"
                : "Tarif Abidjan & Siège appliqué"}
            </span>
            <span className="opacity-80">
              {diaspora
                ? `Pour les résidents hors Côte d'Ivoire (${form.pays}) — Formation 100% en ligne`
                : isInterieur
                ? `Tarif avantageux pour toutes les villes hors Abidjan (${form.ville})`
                : `Tarif standard pour la zone d'Abidjan (${form.ville || 'Abidjan'})`}
            </span>
          </div>
        </div>
      )}

      {/* Formations */}
      <div>
        <SectionHeader
          icon={<BookOpen size={18} />}
          title="Formations visées"
          subtitle="Sélectionnez une ou plusieurs formations"
        />
        <div className="mt-3">
          {courses.length === 0 ? (
            <div className="p-6 bg-primary-50/50 border border-dashed border-primary-200 rounded text-center space-y-1.5">
              <p className="text-sm font-semibold text-surface-700">Chargement des concours disponibles…</p>
              <p className="text-xs text-surface-400">Si les formations ne s'affichent pas, veuillez rafraîchir la page.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1 -mr-1">
              {categories.map(cat => {
                const catCourses = courses.filter(c => (c.category || 'Autres formations') === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-primary-800 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded inline-block">
                      {cat}
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {catCourses.map((c) => {
                        const isSelected = form.courseIds.includes(c.id);
                        const regFee = courseRegistrationFee(c, form.pays, form.ville);
                        const mFee = courseMonthlyFee(c, form.pays, form.mode);
                        const hasPres = c.hasPresentiel !== false;
                        const hasOnl = c.hasOnline !== false;

                        return (
                          <label
                            key={c.id}
                            className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? "border-primary-600 bg-primary-50/60 shadow-[0_0_0_3px_rgba(201,126,0,0.12)]"
                                : "border-surface-300 hover:border-primary-300 bg-white hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              <input type="checkbox" className="sr-only peer" checked={isSelected} onChange={() => toggleCourse(c.id)} />
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 sm:mt-0 w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-600 ${
                                  isSelected ? "bg-primary-600 border-primary-600 text-white" : "border-surface-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-surface-900">{c.title}</span>
                                  {hasPres && (
                                    <span className="text-[10px] font-bold bg-primary-50 text-primary-800 px-2 py-0.5 rounded-full border border-primary-100">
                                      Présentiel
                                    </span>
                                  )}
                                  {hasOnl && (
                                    <span className="text-[10px] font-bold bg-accent-50 text-accent-800 px-2 py-0.5 rounded-full border border-accent-100">
                                      En ligne
                                    </span>
                                  )}
                                </div>
                                {c.description && (
                                  <span className="block text-[11px] text-surface-400 line-clamp-1 mt-0.5">{c.description}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pl-9 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-100">
                              <span className="text-[11px] text-surface-400 font-medium whitespace-nowrap">
                                Inscription : <strong className="text-surface-800 tabular-nums">{regFee.toLocaleString('fr-FR')} F</strong>
                              </span>
                              <span className="text-[13px] font-black text-primary-700 tabular-nums whitespace-nowrap">
                                {mFee.toLocaleString('fr-FR')} F<span className="text-[10px] font-semibold text-surface-400">/mois</span>
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mode de formation */}
      {!diaspora && (
        <div>
          <SectionHeader
            icon={<Monitor size={18} />}
            title="Mode de formation"
            subtitle="Comment souhaitez-vous suivre les cours ?"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
            {MODES.map((m) => {
              const active = form.mode === m.id;
              return (
                <label
                  key={m.id}
                  className={`relative flex flex-col items-center text-center gap-1.5 p-4 border rounded cursor-pointer transition-all duration-150 ${
                    active
                      ? "border-primary-600 bg-primary-50/70 shadow-[0_0_0_3px_rgba(201,126,0,0.12)]"
                      : "border-surface-300 hover:border-primary-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.id}
                    checked={active}
                    onChange={() => onChange("mode", m.id as Mode)}
                    className="sr-only"
                    required
                  />
                  <span className={`w-11 h-11 rounded flex items-center justify-center transition-colors ${active ? "bg-primary-600 text-white" : "bg-surface-100 text-surface-500"}`}>
                    {MODE_ICONS[m.id]}
                  </span>
                  <span className="font-bold text-surface-900 text-[13px] leading-tight">{m.name}</span>
                  <span className="text-surface-400 text-[10px] leading-snug">{m.desc}</span>
                  {active && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Cours particuliers */}
      <label
        className={`flex items-center gap-4 p-4 border rounded cursor-pointer transition-all duration-150 ${
          form.coursParticuliers
            ? "border-primary-600 bg-primary-50 shadow-[0_0_0_3px_rgba(201,126,0,0.12)]"
            : "border-surface-300 hover:border-primary-300 bg-white"
        }`}
      >
        <input
          type="checkbox"
          checked={form.coursParticuliers}
          onChange={(e) => onChange("coursParticuliers", e.target.checked)}
          className="accent-[#c97e00] w-5 h-5 shrink-0"
        />
        <div className="flex-1">
          <div className="font-bold text-surface-900 text-sm flex items-center gap-2">
            <Sparkles size={14} className="text-primary-600" /> Cours particuliers
          </div>
          <div className="text-surface-400 text-xs mt-0.5">Accompagnement individuel — forfait unique à partir de 200 000 FCFA</div>
        </div>
      </label>

      {/* Résumé tarifaire */}
      {form.courseIds.length > 0 && (
        <div className="rounded border border-primary-200 bg-gradient-to-br from-primary-50 to-amber-50/50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-500">Frais d'inscription</span>
            <span className="font-black text-surface-900 tabular-nums">{formatPrice(inscPrice)} FCFA</span>
          </div>
          {!form.coursParticuliers && (
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-500">
                Mensualité ({form.courseIds.length} cours{form.courseIds.length > 1 ? 's' : ''})
              </span>
              <span className="font-black text-surface-900 tabular-nums">{formatPrice(monthlyAmount)} FCFA/mois</span>
            </div>
          )}
          <div className="border-t border-primary-200/70 my-3" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-black text-surface-900">Total aujourd'hui</span>
            <span className="text-xl font-black text-primary-800 tabular-nums">
              {formatPrice(inscPrice + monthlyAmount)} FCFA
            </span>
          </div>
          <p className="text-[11px] text-surface-400 italic mt-2">
            {form.coursParticuliers
              ? "Paiement unique, sans mensualité"
              : "Total = somme des frais d'inscription et mensualités des formations sélectionnées"}
          </p>
        </div>
      )}
    </div>
  );
}


