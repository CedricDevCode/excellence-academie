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
  courses: { id: string; title: string }[];
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">Concours visé(s) *</label>
        <p className="text-xs text-gray-500 mb-3">Sélectionnez un ou plusieurs concours</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {courses.map((c) => (
            <label
              key={c.id}
              className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.courseIds.includes(c.id) ? "border-[#0056B3] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <input
                type="checkbox"
                checked={form.courseIds.includes(c.id)}
                onChange={() => toggleCourse(c.id)}
                className="accent-[#0056B3] w-5 h-5"
              />
              <span className="text-sm font-semibold text-gray-900">{c.title}</span>
            </label>
          ))}
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
