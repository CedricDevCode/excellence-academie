import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, registerAndPay } from "../utils/api";
import { ArrowLeft, ArrowRight, CheckCircle, CreditCard, User, BookOpen, FileText, Loader2, AlertCircle } from "lucide-react";
import { StudentPersonalFields, StudentProgramFields } from "./StudentRegistrationFields";
import { MODES, Mode, calcRegistrationPrice, calcMonthlyAmount, formatPrice, isDiaspora } from "../constants/student";
import { paymentMethods } from "../utils/payment";
import ContractView from "./ContractView";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return /^[0-9+\s\-/()]{8,}$/.test(phone);
}

export interface StudentRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  embedded?: boolean;
  redirectTo?: string;
}

export default function StudentRegistrationForm({ onSuccess, onCancel, embedded, redirectTo }: StudentRegistrationFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => { })
      .finally(() => setLoadingCourses(false));
  }, []);

  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", password: "", telephone: "", dateNaissance: "",
    pays: "", ville: "", courseIds: [] as string[], mode: "" as Mode | "",
    coursParticuliers: false,
    paymentMethod: "",
    geniusPhone: "",
    cgu: false,
  });
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const steps = ["Infos personnelles", "Formation", "Récapitulatif", "Contrat", "Paiement"];

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.nom || !form.prenom || !form.email || !form.password || !form.telephone || !form.pays || !form.ville) {
        setError("Tous les champs obligatoires doivent être remplis.");
        return false;
      }
      if (!validateEmail(form.email)) { setError("Format d'email invalide."); return false; }
      if (form.password.length < 4) { setError("Le mot de passe doit contenir au moins 4 caractères."); return false; }
      if (!validatePhone(form.telephone)) { setError("Format de téléphone invalide (ex: 07 XX XX XX XX)."); return false; }
    }
    if (s === 2) {
      if (form.courseIds.length === 0) { setError("Veuillez sélectionner au moins un concours."); return false; }
      if (!isDiaspora(form.pays) && !form.mode) { setError("Veuillez choisir un mode de formation."); return false; }
    }
    if (s === 4) {
      if (!signature) { setError("Veuillez signer le contrat avant de continuer."); return false; }
    }
    return true;
  };

  const goNextStep = () => {
    setError(null);
    if (validateStep(step)) setStep(s => s + 1);
  };

  const payWithMethod = async () => {
    setError(null);
    if (!form.paymentMethod) { setError("Veuillez choisir un moyen de paiement."); return; }
    if (!form.geniusPhone) { setError("Veuillez entrer votre numéro de téléphone pour le paiement."); return; }
    if (!embedded && !form.cgu) { setError("Vous devez accepter les conditions générales."); return; }

    if (signature) {
      sessionStorage.setItem('pending_contract_signature', signature);
      sessionStorage.setItem('pending_contract_email', form.email);
    }

    setSubmitting(true);
    try {
      const payment = await registerAndPay({
        name: `${form.prenom} ${form.nom}`.trim(),
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        password: form.password,
        telephone: form.telephone,
        pays: form.pays,
        ville: form.ville,
        courseIds: form.courseIds,
        mode: form.mode,
        coursParticuliers: form.coursParticuliers,
        paymentMethod: form.paymentMethod,
        geniusPhone: form.geniusPhone,
        dateNaissance: form.dateNaissance,
      });
      if (payment.checkoutUrl) {
        sessionStorage.setItem('geniuspay_reference', payment.reference);
        sessionStorage.setItem('geniuspay_email', form.email);
        if (embedded) {
          window.open(payment.checkoutUrl, '_blank');
          if (redirectTo) { navigate(redirectTo); return; }
          if (onSuccess) onSuccess();
        } else {
          window.location.href = payment.checkoutUrl;
        }
      }
    } catch (err: any) {
      setError(err?.message || "Impossible d'initialiser le paiement. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await payWithMethod();
  };

  const effectiveMode = form.mode || (isDiaspora(form.pays) ? 'en_ligne' as Mode : undefined);
  const inscPrice = calcRegistrationPrice(form.pays, form.mode || 'presentiel', form.ville, form.coursParticuliers);
  const monthlyAmount = calcMonthlyAmount(form.pays, (form.mode || 'presentiel') as Mode, form.coursParticuliers, form.courseIds.length);
  const totalAmount = inscPrice + (form.coursParticuliers ? 0 : monthlyAmount);

  if (successMsg) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Inscription réussie !</h2>
        <p className="text-gray-500 text-sm mb-4">{successMsg}</p>
        <Loader2 size={24} className="animate-spin text-[#0056B3] mx-auto" />
      </div>
    );
  }

  // Mapping des IDs de l'inscription vers les IDs du panier
  const paymentMethodMap: Record<string, string> = {
    wave: "WAVE",
    orange: "ORANGE_MONEY",
    mtn: "MTN_MOMO",
    moov: "MOOV",
    card: "CARTE",
  };
  const localMethods = paymentMethods.filter(p => p.id !== "MOBILE_MONEY").map(p => ({
    id: Object.keys(paymentMethodMap).find(k => paymentMethodMap[k] === p.id) || p.id,
    name: p.name,
    image: p.image,
  }));

  const handleMethodSelect = (methodId: string) => {
    update("paymentMethod", methodId);
    setError(null);
  };

  const selectedCourses = courses.filter((c) => form.courseIds.includes(c.id));

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <User size={20} className="text-[#0056B3]" />
            <h2 className="text-xl font-black text-gray-900">Informations personnelles</h2>
          </div>
          <StudentPersonalFields form={form as any} onChange={update as any} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={20} className="text-[#0056B3]" />
            <h2 className="text-xl font-black text-gray-900">Choix de la formation</h2>
          </div>
          {loadingCourses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#0056B3]" />
              <span className="ml-2 text-gray-500 text-sm">Chargement des formations...</span>
            </div>
          ) : (
            <StudentProgramFields form={form as any} courses={courses} onChange={update as any} />
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={20} className="text-[#0056B3]" />
            <h2 className="text-xl font-black text-gray-900">Récapitulatif de votre inscription</h2>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-3">
            {[
              { label: "Nom complet", val: `${form.prenom} ${form.nom}` },
              { label: "Email", val: form.email },
              { label: "Téléphone", val: form.telephone },
              { label: "Pays", val: form.pays },
              { label: "Ville", val: form.ville },
              { label: "Concours", val: selectedCourses.map((c) => c.title).join(", ") || "—" },
              ...(form.mode ? [{ label: "Mode", val: MODES.find(m => m.id === form.mode)?.name || form.mode }] : []),
              ...(form.coursParticuliers ? [{ label: "Cours particuliers", val: "Oui (forfait unique)" }] : []),
            ].map((item, i) => (
              <div key={i} className="flex items-start justify-between text-sm">
                <span className="text-gray-500 font-medium">{item.label}</span>
                <span className="text-gray-900 font-bold text-right ml-4">{item.val || "—"}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Frais d'inscription</span>
                <span className="font-bold text-gray-900">{formatPrice(inscPrice)} FCFA</span>
              </div>
              {!form.coursParticuliers && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Mensualité (1er mois inclus)</span>
                  <span className="font-bold text-gray-900">{formatPrice(monthlyAmount)} FCFA</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="font-black text-gray-900">Total à payer aujourd'hui</span>
                <span className="font-black text-2xl text-[#0056B3]">{formatPrice(totalAmount)} FCFA</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <ContractView onSign={setSignature} signatureData={signature} studentName={`${form.prenom} ${form.nom}`.trim()} />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard size={20} className="text-[#0056B3]" />
            <h2 className="text-xl font-black text-gray-900">Paiement de l'inscription</h2>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">Frais d'inscription</div>
                <div className="text-gray-500 text-sm">{selectedCourses.map((c) => c.title).join(", ") || "Concours"}</div>
                {form.coursParticuliers && <div className="text-gray-500 text-xs">Cours particuliers (forfait unique)</div>}
              </div>
              <div className="font-black text-lg text-gray-900">{formatPrice(inscPrice)} FCFA</div>
            </div>
            {!form.coursParticuliers && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900 text-sm">1ère mensualité</div>
                </div>
                <div className="font-black text-gray-900">{formatPrice(monthlyAmount)} FCFA</div>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-blue-200">
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-2xl text-[#0056B3]">{formatPrice(totalAmount)} FCFA</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">Choisissez votre moyen de paiement</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {localMethods.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleMethodSelect(p.id)}
                  className={`flex flex-col items-center gap-3 p-6 border-2 rounded-2xl transition-all cursor-pointer hover:shadow-lg hover:border-[#0056B3]
                    ${form.paymentMethod === p.id ? "border-[#0056B3] bg-blue-50 shadow-md" : "border-gray-200 bg-white"}`}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-14 w-auto object-contain" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">💳</div>
                  )}
                  <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          {form.paymentMethod && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Numéro de téléphone pour le paiement</label>
              <input type="tel" value={form.geniusPhone} onChange={e => update("geniusPhone", e.target.value)}
                placeholder="Ex: 07 01 02 03 04"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors" />
            </div>
          )}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-center gap-2">
            <span>🔒</span>
            <span><strong>Paiement sécurisé</strong> via GeniusPay.</span>
          </div>
          {!embedded && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.cgu} onChange={e => update("cgu", e.target.checked)}
                className="mt-1 accent-[#0056B3]" />
              <span className="text-sm text-gray-600">
                J'accepte les <a href="/cgu" className="text-[#0056B3] hover:underline" target="_blank">conditions générales d'utilisation</a> et je confirme que les informations fournies sont exactes.
              </span>
            </label>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        {step > 1 ? (
          <button type="button" onClick={() => { setError(null); setStep(s => s - 1); }}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 font-semibold text-sm transition-all">
            <ArrowLeft size={16} /> Précédent
          </button>
        ) : (
          onCancel && (
            <button type="button" onClick={onCancel}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 font-semibold text-sm transition-all">
              <ArrowLeft size={16} /> Annuler
            </button>
          )
        )}

        {step < 3 ? (
          <button type="button" onClick={goNextStep}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0056B3] hover:bg-[#003375] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg">
            Suivant <ArrowRight size={16} />
          </button>
        ) : step === 3 ? (
          <button type="button" onClick={() => { setError(null); setStep(4); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0056B3] hover:bg-[#003375] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg">
            <FileText size={16} /> Voir le contrat <ArrowRight size={16} />
          </button>
        ) : step === 4 ? (
          <button type="button" onClick={goNextStep}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg">
            Procéder au paiement <ArrowRight size={16} />
          </button>
        ) : (
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : "💳"}
            {submitting ? "Paiement en cours..." : "Payer maintenant"} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
