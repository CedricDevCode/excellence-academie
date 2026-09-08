import { MODES, VILLES, PAYS, Mode, calcRegistrationPrice, calcMonthlyAmount, formatPrice, isDiaspora } from "../constants/student";

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

export function StudentPersonalFields({
  form,
  onChange,
  showPassword = true,
  showDateNaissance = true,
}: StudentPersonalFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom *</label>
          <input
            required
            value={form.nom}
            onChange={(e) => onChange("nom", e.target.value)}
            placeholder="Votre nom de famille"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prénom *</label>
          <input
            required
            value={form.prenom}
            onChange={(e) => onChange("prenom", e.target.value)}
            placeholder="Votre prénom"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="votre@email.com"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
          />
        </div>
        {showPassword && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe *</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="Créez un mot de passe"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone (WhatsApp) *</label>
        <input
          required
          type="tel"
          value={form.telephone}
          onChange={(e) => onChange("telephone", e.target.value)}
          placeholder="07 XX XX XX XX"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
        />
      </div>

      {showDateNaissance && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date de naissance</label>
          <input
            type="date"
            value={form.dateNaissance}
            onChange={(e) => onChange("dateNaissance", e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pays *</label>
        <select
          required
          value={form.pays}
          onChange={(e) => onChange("pays", e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
        >
          <option value="">Sélectionnez votre pays...</option>
          {PAYS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ville / Centre *</label>
        <select
          required
          value={form.ville}
          onChange={(e) => onChange("ville", e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0056B3] focus:outline-none text-sm"
        >
          <option value="">Sélectionnez votre ville...</option>
          {VILLES.map((ville) => (
            <option key={ville} value={ville}>{ville}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function StudentProgramFields({ form, courses, onChange }: StudentProgramFieldsProps) {
  const selectedPays = form.pays;
  const diaspora = isDiaspora(selectedPays);

  const toggleCourse = (id: string) => {
    const next = form.courseIds.includes(id)
      ? form.courseIds.filter(c => c !== id)
      : [...form.courseIds, id];
    onChange("courseIds", next);
  };

  const inscPrice = calcRegistrationPrice(selectedPays, form.mode || 'presentiel', form.ville, form.coursParticuliers);
  const monthlyAmount = calcMonthlyAmount(selectedPays, form.mode || 'presentiel', form.coursParticuliers, form.courseIds.length);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Formation(s) et Concours visé(s) *</label>
        <p className="text-xs text-gray-500 mb-3">Sélectionnez une ou plusieurs formations dispensées par notre académie</p>
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {Array.from(new Set(courses.map(c => c.category || 'Autres formations'))).map(cat => {
            const catCourses = courses.filter(c => (c.category || 'Autres formations') === cat);
            return (
              <div key={cat} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0056B3] bg-blue-50/60 px-2.5 py-1 rounded-md inline-block">
                  {cat}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {catCourses.map((c) => {
                    const isSelected = form.courseIds.includes(c.id);
                    const regFee = c.registrationFee !== undefined && c.registrationFee !== null ? Number(c.registrationFee) : (c.price ? Number(c.price) : 35000);
                    const mFee = c.monthlyFee !== undefined && c.monthlyFee !== null ? Number(c.monthlyFee) : 30000;
                    const hasPres = c.hasPresentiel !== false;
                    const hasOnl = c.hasOnline !== false;

                    return (
                      <label
                        key={c.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? "border-[#0056B3] bg-blue-50/50 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCourse(c.id)}
                            className="accent-[#0056B3] w-5 h-5 rounded mt-0.5 sm:mt-0 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900 block">{c.title}</span>
                              <div className="flex items-center gap-1">
                                {hasPres && (
                                  <span className="inline-block text-[10px] font-semibold bg-blue-100/70 text-[#0056B3] px-1.5 py-0.5 rounded">
                                    Présentiel
                                  </span>
                                )}
                                {hasOnl && (
                                  <span className="inline-block text-[10px] font-semibold bg-purple-100/70 text-purple-700 px-1.5 py-0.5 rounded">
                                    En ligne
                                  </span>
                                )}
                              </div>
                            </div>
                            {c.description && (
                              <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{c.description}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pl-8 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <span className="text-[11px] text-gray-500 font-medium">
                            Inscription : <strong className="text-gray-900">{regFee.toLocaleString('fr-FR')} F</strong>
                          </span>
                          <span className="text-xs font-black text-[#FF6B00]">
                            {mFee.toLocaleString('fr-FR')} F<span className="text-[10px] font-semibold text-gray-400">/mois</span>
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
      </div>

      {!diaspora && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Mode de formation *</label>
          <div className="space-y-3">
            {MODES.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${form.mode === m.id ? "border-[#0056B3] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m.id}
                  checked={form.mode === m.id}
                  onChange={(e) => onChange("mode", e.target.value as Mode)}
                  className="accent-[#0056B3]"
                  required
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">{m.name}</div>
                  <div className="text-gray-500 text-xs">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label
          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${form.coursParticuliers ? "border-[#0056B3] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
        >
          <input
            type="checkbox"
            checked={form.coursParticuliers}
            onChange={(e) => onChange("coursParticuliers", e.target.checked)}
            className="accent-[#0056B3] w-5 h-5"
          />
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Cours particuliers</div>
            <div className="text-gray-500 text-xs">Forfait unique à partir de 200 000 FCFA</div>
          </div>
        </label>
      </div>

      {form.courseIds.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Frais d'inscription</span>
            <span className="font-bold text-gray-900">{formatPrice(inscPrice)} FCFA</span>
          </div>
          {!form.coursParticuliers && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mensualité ({form.courseIds.length} cours{form.courseIds.length > 1 ? 's' : ''})</span>
              <span className="font-bold text-gray-900">{formatPrice(monthlyAmount)} FCFA/mois</span>
            </div>
          )}
          {form.courseIds.length > 1 && !form.coursParticuliers && (
            <p className="text-xs text-gray-500 italic">+10 000 FCFA/cours supplémentaire</p>
          )}
          {form.coursParticuliers && (
            <p className="text-xs text-gray-500 italic">Paiement unique, pas de mensualité</p>
          )}
        </div>
      )}
    </div>
  );
}
