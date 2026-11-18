import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, registerAndPay, getMe } from "../utils/api";
import OtpCountdown from "./OtpCountdown";
import { ArrowLeft, ArrowRight, CheckCircle, CreditCard, User, BookOpen, Loader2, AlertCircle, Sparkles, Lock, Check, ClipboardList, ShieldCheck } from "lucide-react";
import { StudentPersonalFields, StudentProgramFields } from "./StudentRegistrationFields";
import { MODES, Mode, calcRegistrationTotal, calcMonthlyTotal, formatPrice, isDiaspora } from "../constants/student";
import { paymentMethods } from "../utils/payment";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return /^[0-9+\s\-/()]{8,}$/.test(phone);
}

const STEPS = [
  { n: 1, label: "Informations", icon: <User size={15} /> },
  { n: 2, label: "Formation", icon: <BookOpen size={15} /> },
  { n: 3, label: "Récapitulatif", icon: <ClipboardList size={15} /> },
  { n: 4, label: "Paiement", icon: <CreditCard size={15} /> },
];

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const current = step === s.n;
          return (
            <div key={s.n} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded flex items-center justify-center border-2 transition-all duration-200 ${
                    done
                      ? "bg-primary-600 border-primary-600 text-white"
                      : current
                      ? "bg-white border-primary-600 text-primary-700 shadow-[0_0_0_4px_rgba(201,126,0,0.15)]"
                      : "bg-surface-50 border-surface-200 text-surface-400"
                  }`}
                >
                  {done ? <Check size={16} strokeWidth={3} /> : s.icon}
                </div>
                <span
                  className={`hidden sm:block text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                    current ? "text-primary-800" : done ? "text-surface-700" : "text-surface-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 sm:mx-3 rounded-full bg-surface-200 overflow-hidden translate-y-0 sm:-translate-y-2.5">
                  <div
                    className="h-full bg-primary-600 transition-all duration-500"
                    style={{ width: step > s.n ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
    dateInscription: new Date().toISOString().split("T")[0],
    remiseAmount: 0,
    remiseNote: "",
    remiseDate: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResending, setOtpResending] = useState(false);

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

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
    if (s === 3) {
      if (embedded && form.remiseAmount > 0 && !form.remiseNote.trim()) { setError("Un justificatif de remise est requis si une remise est appliquée."); return false; }
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
    if (embedded && form.remiseAmount > 0 && !form.remiseNote.trim()) { setError("Un justificatif de remise est requis si une remise est appliquée."); return; }

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
            ...(embedded ? { dateInscription: form.dateInscription, remiseAmount: Number(form.remiseAmount || 0), remiseNote: form.remiseNote.trim(), remiseDate: form.remiseDate || null } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de l'inscription");
        setOtpEmail(data.otpEmail || "");
        setOtpExpiresAt(typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 15 * 60 * 1000);
        setOtpCode("");
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
        ...(embedded ? { dateInscription: form.dateInscription, remiseAmount: Number(form.remiseAmount || 0), remiseNote: form.remiseNote.trim(), remiseDate: form.remiseDate || null } : {}),
      } as any);
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

  const resendOtp = async () => {
    setError(null);
    setOtpResending(true);
    try {
      const res = await fetch('/api/auth/resend-cash-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du renvoi du code");
      setOtpCode("");
      setOtpExpiresAt(typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 15 * 60 * 1000);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du renvoi du code");
    } finally {
      setOtpResending(false);
    }
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
  const remiseApplied = Math.min(Math.max(0, Number(form.remiseAmount || 0)), inscPrice);
  const inscNet = Math.max(0, inscPrice - remiseApplied);
  const totalAmount = inscNet + monthlyAmount;

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
    setForm(f => ({
      ...f,
      paymentMethod: methodId,
      geniusPhone: f.geniusPhone || f.telephone || "",
    }));
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stepper step={step} />

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
          <StudentPersonalFields form={form as any} onChange={update as any} />
          {embedded && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="reg-date-inscription">Date d'inscription *</label>
              <input
                id="reg-date-inscription"
                type="date"
                required
                value={form.dateInscription}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => update("dateInscription", e.target.value)}
                className="w-full px-4 py-3 bg-surface-50/60 border border-surface-300 rounded-xl text-sm text-surface-900 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all"
              />
              <p className="text-[11px] text-surface-400 mt-1">Date effective de l'inscription (comptabilisée pour les revenus et la prochaine mensualité).</p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {loadingCourses ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin text-[#c97e00]" />
              <span className="text-surface-400 text-sm font-medium">Chargement des formations…</span>
            </div>
          ) : (
            <StudentProgramFields form={form as any} courses={courses} onChange={update as any} />
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded border border-surface-300 overflow-hidden">
            <div className="px-5 py-3 bg-surface-50 border-b border-surface-200 flex items-center gap-2">
              <ClipboardList size={16} className="text-primary-700" />
              <span className="text-xs font-black uppercase tracking-wider text-surface-600">Vos informations</span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: "Nom complet", val: `${form.prenom} ${form.nom}` },
                { label: "Email", val: form.email },
                { label: "Téléphone", val: form.telephone },
                { label: "Pays", val: form.pays },
                { label: "Ville / Centre", val: form.ville },
                { label: "Concours", val: selectedCourses.map((c) => c.title).join(", ") || "—" },
                ...(form.mode ? [{ label: "Mode", val: MODES.find(m => m.id === form.mode)?.name || form.mode }] : []),
                 ...(form.coursParticuliers ? [{ label: "Formule", val: "Cours particuliers (forfait)" }] : []),
                ...(embedded && remiseApplied > 0 ? [{ label: "Remise", val: `−${formatPrice(remiseApplied)} FCFA${form.remiseNote ? ` — ${form.remiseNote}` : ''}` }] : []),
              ].map((item, i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-surface-400">{item.label}</dt>
                  <dd className="text-sm text-surface-900 font-semibold mt-0.5 break-words">{item.val || "—"}</dd>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-primary-200 bg-gradient-to-br from-primary-50 to-amber-50/50 p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-surface-500">Frais d'inscription</span>
                <span className="font-bold text-surface-900 tabular-nums">{formatPrice(inscPrice)} FCFA</span>
              </div>
              {remiseApplied > 0 && (
                <div className="flex items-center justify-between gap-3 text-sm text-accent-700">
                  <span>Remise</span>
                  <span className="font-bold tabular-nums">− {formatPrice(remiseApplied)} FCFA</span>
                </div>
              )}
            {!form.coursParticuliers && (
              <div className="flex items-center justify-between gap-3 text-sm mt-2">
                <span className="text-surface-500">1ère mensualité</span>
                <span className="font-bold text-surface-900 tabular-nums">{formatPrice(monthlyAmount)} FCFA</span>
              </div>
            )}
            <div className="border-t border-primary-200/70 my-3" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-surface-900">Total à payer</span>
              <span className="font-black text-2xl text-primary-800 tabular-nums">{formatPrice(totalAmount)} FCFA</span>
            </div>
          </div>

          {embedded && (
            <div className="rounded border border-dashed border-surface-300 p-4 bg-surface-50/40">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2">Remise (optionnel)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="remise-amount">Montant (FCFA)</label>
                  <input id="remise-amount" type="number" min={0} step={1000} value={form.remiseAmount} onChange={e => update("remiseAmount", Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-sm num focus:border-primary-600 focus:outline-none" placeholder="0" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="remise-note">Justificatif *</label>
                  <input id="remise-note" type="text" value={form.remiseNote} onChange={e => update("remiseNote", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none" placeholder="Ex: Remise 10 % accordée par la direction le 17/11/2026" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="remise-date">Date de la remise</label>
                  <input id="remise-date" type="date" value={form.remiseDate} max={new Date().toISOString().split('T')[0]} onChange={e => update("remiseDate", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
              </div>
              {form.remiseAmount > 0 && (
                <p className="text-[11px] text-accent-700 font-semibold mt-2">La remise sera enregistrée sur le paiement avec son justificatif et sa date.</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-surface-400 text-center">Vérifiez vos informations — vous pourrez modifier l'inscription en contactant le secrétariat.</p>
        </div>
      )}

      {step === 4 && !otpStep && (
        <div className="space-y-5">
          {/* Total */}
          <div className="rounded bg-surface-900 text-white p-5 flex items-center justify-between gap-4 shadow-lg">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary-300">Total à régler</div>
              <div className="text-xs text-surface-300 mt-1 truncate">{selectedCourses.map((c) => c.title).join(", ") || "Inscription"}{form.coursParticuliers ? " · Forfait particulier" : ""}</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tabular-nums whitespace-nowrap text-primary-300">{formatPrice(totalAmount)} <span className="text-xs font-bold text-surface-300">FCFA</span></div>
          </div>

          {/* Moyen de paiement */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">Moyen de paiement</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {localMethods.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleMethodSelect(p.id)}
                  className={`flex flex-col items-center gap-2 p-3 border rounded transition-all duration-150 ${
                    form.paymentMethod === p.id
                      ? "border-primary-600 bg-primary-50 shadow-[0_0_0_3px_rgba(201,126,0,0.15)]"
                      : "border-surface-300 bg-white hover:border-primary-300 hover:shadow-sm"
                  }`}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-8 sm:h-9 w-auto object-contain" />
                  ) : (
                    <div className="h-8 sm:h-9 flex items-center text-2xl text-surface-400"><CreditCard size={22} /></div>
                  )}
                  <span className="font-semibold text-surface-700 text-[10px] leading-tight text-center">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          {form.paymentMethod && form.paymentMethod !== "especes" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5 block" htmlFor="reg-geniusphone">Numéro de téléphone pour le paiement</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"><CreditCard size={17} /></span>
                <input
                  id="reg-geniusphone"
                  type="tel"
                  value={form.geniusPhone}
                  onChange={e => update("geniusPhone", e.target.value)}
                  placeholder="Ex: 07 01 02 03 04"
                  autoComplete="tel"
                  className="w-full pl-11 pr-4 py-3 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
              </div>
            </div>
          )}
          {form.paymentMethod === "especes" && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800 flex items-start gap-2.5">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              <span>Un code de confirmation sera envoyé par email à l'adresse de l'établissement. Vous devrez le saisir pour finaliser l'inscription.</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-xs text-accent-900 bg-accent-50 border border-accent-200 rounded px-4 py-3">
            <ShieldCheck size={16} className="shrink-0" />
            <span><strong>Paiement 100% sécurisé</strong> — transactions chiffrées via GeniusPay.</span>
          </div>
          {!embedded && (
            <label className="flex items-start gap-3 cursor-pointer select-none group">
              <input type="checkbox" checked={form.cgu} onChange={e => update("cgu", e.target.checked)}
                className="mt-0.5 accent-[#c97e00] w-4 h-4 shrink-0" />
              <span className="text-xs text-surface-500 leading-relaxed group-hover:text-surface-700 transition-colors">
                J'accepte les <a href="/cgu" className="text-primary-700 font-semibold hover:underline" target="_blank">conditions générales d'utilisation</a> et je confirme que les informations fournies sont exactes.
              </span>
            </label>
          )}
        </div>
      )}

      {step === 4 && otpStep && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={20} className="text-primary-600" />
            <h2 className="text-lg font-black text-surface-900">Confirmation par code OTP</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
            Un code de confirmation a été envoyé à <strong>{otpEmail || "l'adresse de l'établissement"}</strong>. Veuillez le saisir ci-dessous pour finaliser l'inscription.
          </div>
          <div className="flex items-center justify-between gap-3 px-1">
            <OtpCountdown expiresAt={otpExpiresAt} />
            <button type="button" onClick={resendOtp} disabled={otpResending}
              className="text-xs font-bold text-primary-800 hover:text-primary-900 hover:underline disabled:opacity-50 disabled:no-underline transition-colors">
              {otpResending ? 'Envoi en cours…' : 'Renvoyer le code'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold text-surface-600 mb-1" htmlFor="otp-input">Code OTP</label>
            <input id="otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" value={otpCode} onChange={e => setOtpCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyOtp(); } }}
              placeholder="Entrez le code reçu par email"
              className="w-full px-4 py-3 border-2 border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-colors text-center text-lg tracking-widest font-black tabular-nums"
              maxLength={8} autoFocus />
          </div>
          <button type="button" onClick={verifyOtp} disabled={otpLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all shadow-md hover:shadow-lg disabled:opacity-50">
            {otpLoading ? <><Loader2 size={16} className="animate-spin" /> Vérification...</> : <><CheckCircle size={16} /> Confirmer l'inscription</>}
          </button>
          <button type="button" onClick={() => { setOtpStep(false); setOtpCode(""); setError(null); }}
            className="w-full text-center text-sm text-surface-500 hover:text-surface-700 underline">
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
            Continuer <ArrowRight size={14} />
          </button>
        ) : step === 3 ? (
          <button type="button" onClick={() => { setError(null); setStep(4); }}
            className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-[#c97e00] hover:bg-[#6b4500] text-white font-bold text-xs sm:text-sm rounded transition-all shadow-md hover:shadow-lg">
            Procéder au paiement <ArrowRight size={14} />
          </button>
        ) : (
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold sm:font-black text-sm sm:text-base rounded transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {submitting ? "Paiement en cours..." : "Payer maintenant"} <ArrowRight size={16} />
          </button>
        )}
      </div>
      )}
    </form>
  );
}
