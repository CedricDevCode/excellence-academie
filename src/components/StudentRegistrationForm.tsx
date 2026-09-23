import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, registerAndPay, getMe } from "../utils/api";
import { ArrowLeft, ArrowRight, CheckCircle, CreditCard, User, BookOpen, FileText, Loader2, AlertCircle, Sparkles, Lock } from "lucide-react";
import { StudentPersonalFields, StudentProgramFields } from "./StudentRegistrationFields";
import { MODES, Mode, calcRegistrationTotal, calcMonthlyTotal, formatPrice, isDiaspora } from "../constants/student";
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
  const [loggedInUser, setLoggedInUser] = useState<any | null>(null);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => { })
      .finally(() => setLoadingCourses(false));

    getMe()
      .then(user => {
        if (user && user.role === 'STUDENT') {
          setLoggedInUser(user);
        }
      })
      .catch(() => {});
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
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const steps = ["Infos personnelles", "Formation", "Récapitulatif", "Contrat", "Paiement"];

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.nom || !form.prenom || !form.email || !form.password || !form.telephone || !form.pays || !form.ville) {
        setError("Tous les champs obligatoires doivent être remplis.");
        return false;
      }
      if (!validateEmail(form.email)) { setError("Format d'email invalide."); return false; }
      if (form.password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return false; }
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
    if (form.paymentMethod !== "especes" && !form.geniusPhone) { setError("Veuillez entrer votre numéro de téléphone pour le paiement."); return; }
    if (!embedded && !form.cgu) { setError("Vous devez accepter les conditions générales."); return; }

    if (signature) {
      sessionStorage.setItem('pending_contract_signature', signature);
      sessionStorage.setItem('pending_contract_email', form.email);
    }

    setSubmitting(true);
    try {
      if (form.paymentMethod === "especes") {
        const res = await fetch('/api/auth/register-cash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
            dateNaissance: form.dateNaissance,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de l'inscription");
        setOtpStep(true);
        setSubmitting(false);
        return;
      }

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

  const verifyOtp = async () => {
    setError(null);
    if (!otpCode || otpCode.length < 4) { setError("Veuillez entrer le code OTP reçu par email."); return; }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/confirm-cash-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code OTP invalide");
      setSuccessMsg("Inscription confirmée avec succès !");
      setOtpStep(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la confirmation");
    } finally {
      setOtpLoading(false);
    }
  };

  const selectedCourses = courses.filter((c) => form.courseIds.includes(c.id));
  const inscPrice = calcRegistrationTotal(selectedCourses, form.coursParticuliers, form.pays, form.ville);
  const monthlyAmount = calcMonthlyTotal(selectedCourses, form.coursParticuliers, form.pays, form.mode);
  const totalAmount = inscPrice + monthlyAmount;

  if (successMsg) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Inscription réussie !</h2>
        <p className="text-gray-500 text-sm mb-4">{successMsg}</p>
        <Loader2 size={24} className="animate-spin text-[#c97e00] mx-auto" />
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
    especes: "ESPECES",
  };
  const localMethods = paymentMethods.filter(p => {
    if (p.id === "MOBILE_MONEY") return false;
    if (p.id === "ESPECES" && !embedded) return false;
    return true;
  }).map(p => ({
    id: Object.keys(paymentMethodMap).find(k => paymentMethodMap[k] === p.id) || p.id,
    name: p.name,
    image: p.image,
  }));

  const handleMethodSelect = (methodId: string) => {
    update("paymentMethod", methodId);
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Banner if already logged in */}
      {loggedInUser && (
        <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-amber-50 to-orange-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[#c97e00] text-white">
              <Sparkles size={18} />
            </span>
            <div className="text-xs">
              <span className="font-bold text-gray-900 block">
                Vous êtes déjà connecté en tant que {loggedInUser.name || loggedInUser.email} !
              </span>
              <span className="text-gray-600">
                Vous n'avez pas besoin de remplir ce formulaire. Ajoutez une formation supplémentaire à tarif préférentiel depuis votre espace.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard?tab=courses&openAdd=1')}
            className="shrink-0 px-4 py-2 bg-[#c97e00] text-white text-xs font-bold rounded-lg hover:bg-[#7a4b00] transition-colors shadow-xs cursor-pointer"
          >
            Ajouter depuis mon compte →
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3" role="alert">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <User size={20} className="text-[#c97e00]" />
            <h2 className="text-xl font-black text-gray-900">Informations personnelles</h2>
          </div>
          <StudentPersonalFields form={form as any} onChange={update as any} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={20} className="text-[#c97e00]" />
            <h2 className="text-xl font-black text-gray-900">Choix de la formation</h2>
          </div>
          {loadingCourses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#c97e00]" />
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
            <BookOpen size={20} className="text-[#c97e00]" />
            <h2 className="text-xl font-black text-gray-900">Récapitulatif de votre inscription</h2>
          </div>
          <div className="bg-gray-50 rounded p-6 text-left space-y-3">
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
                <span className="font-black text-2xl text-[#c97e00]">{formatPrice(totalAmount)} FCFA</span>
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

      {step === 5 && !otpStep && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard size={20} className="text-[#c97e00]" />
            <h2 className="text-xl font-black text-gray-900">Paiement de l'inscription</h2>
          </div>
          <div className="bg-primary-50 border-2 border-primary-200 rounded sm:rounded p-3 sm:p-4 space-y-2">
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
            <div className="flex items-center justify-between pt-2 border-t border-primary-200">
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-xl sm:text-2xl text-[#c97e00]">{formatPrice(totalAmount)} FCFA</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">Choisissez votre moyen de paiement</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              {localMethods.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleMethodSelect(p.id)}
                  className={`flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-6 border-2 rounded sm:rounded transition-all cursor-pointer hover:shadow-lg hover:border-[#c97e00]
                    ${form.paymentMethod === p.id ? "border-[#c97e00] bg-primary-50 shadow-md" : "border-gray-200 bg-white"}`}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-8 sm:h-14 w-auto object-contain" />
                  ) : (
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg sm:rounded bg-surface-50 flex items-center justify-center text-lg sm:text-2xl">💳</div>
                  )}
                  <span className="font-semibold text-gray-900 text-xs sm:text-sm">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          {form.paymentMethod && form.paymentMethod !== "especes" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Numéro de téléphone pour le paiement</label>
              <input type="tel" value={form.geniusPhone} onChange={e => update("geniusPhone", e.target.value)}
                placeholder="Ex: 07 01 02 03 04"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-colors" />
            </div>
          )}
          {form.paymentMethod === "especes" && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
              Un code de confirmation sera envoyé par email à <strong>{form.email}</strong>. Vous devrez le saisir pour finaliser l'inscription.
            </div>
          )}
          <div className="bg-green-50 border-2 border-green-200 rounded p-4 text-sm text-green-800 flex items-center gap-2">
            <span>🔒</span>
            <span><strong>Paiement sécurisé</strong> via GeniusPay.</span>
          </div>
          {!embedded && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.cgu} onChange={e => update("cgu", e.target.checked)}
                className="mt-1 accent-[#c97e00]" />
              <span className="text-sm text-gray-600">
                J'accepte les <a href="/cgu" className="text-[#c97e00] hover:underline" target="_blank">conditions générales d'utilisation</a> et je confirme que les informations fournies sont exactes.
              </span>
            </label>
          )}
        </div>
      )}

      {step === 5 && otpStep && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={20} className="text-[#c97e00]" />
            <h2 className="text-xl font-black text-gray-900">Confirmation par code OTP</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
            Un code de confirmation a été envoyé à <strong>{form.email}</strong>. Veuillez le saisir ci-dessous pour finaliser l'inscription.
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Code OTP</label>
            <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)}
              placeholder="Entrez le code reçu par email"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-colors text-center text-lg tracking-widest"
              maxLength={8} />
          </div>
          <button type="button" onClick={verifyOtp} disabled={otpLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#c97e00] hover:bg-[#6b4500] text-white font-bold text-sm rounded transition-all shadow-md hover:shadow-lg disabled:opacity-50">
            {otpLoading ? <><Loader2 size={16} className="animate-spin" /> Vérification...</> : <><CheckCircle size={16} /> Confirmer l'inscription</>}
          </button>
          <button type="button" onClick={() => { setOtpStep(false); setOtpCode(""); setError(null); }}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 underline">
            Retour au paiement
          </button>
        </div>
      )}

      {!otpStep && (
      <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
        {step > 1 ? (
          <button type="button" onClick={() => { setError(null); setStep(s => s - 1); }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-gray-200 text-gray-600 rounded hover:border-gray-300 font-semibold text-xs sm:text-sm transition-all">
            <ArrowLeft size={14} /> Précédent
          </button>
        ) : (
          onCancel && (
            <button type="button" onClick={onCancel}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-gray-200 text-gray-600 rounded hover:border-gray-300 font-semibold text-xs sm:text-sm transition-all">
              <ArrowLeft size={14} /> Annuler
            </button>
          )
        )}

        {step < 3 ? (
          <button type="button" onClick={goNextStep}
            className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-[#c97e00] hover:bg-[#6b4500] text-white font-bold text-xs sm:text-sm rounded transition-all shadow-md hover:shadow-lg">
            Suivant <ArrowRight size={14} />
          </button>
        ) : step === 3 ? (
          <button type="button" onClick={() => { setError(null); setStep(4); }}
            className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-[#c97e00] hover:bg-[#6b4500] text-white font-bold text-xs sm:text-sm rounded transition-all shadow-md hover:shadow-lg">
            <FileText size={14} /> Voir le contrat <ArrowRight size={14} />
          </button>
        ) : step === 4 ? (
          <button type="button" onClick={goNextStep}
            className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm rounded transition-all shadow-md hover:shadow-lg">
            Procéder au paiement <ArrowRight size={14} />
          </button>
        ) : (
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold sm:font-black text-sm sm:text-base rounded transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : "💳"}
            {submitting ? "Paiement en cours..." : "Payer maintenant"} <ArrowRight size={16} />
          </button>
        )}
      </div>
      )}
    </form>
  );
}
