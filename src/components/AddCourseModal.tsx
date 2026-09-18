import { useState, useEffect, useMemo } from "react";
import {
  X,
  GraduationCap,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Phone,
  ArrowRight,
  Info,
} from "lucide-react";
import { fetchCourses, fetchAppSettings, addCourseForExistingStudent } from "../utils/api";
import { courseMonthlyFee, isDiaspora, formatPrice, Mode, MODES } from "../constants/student";
import { paymentMethods } from "../utils/payment";

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  subscribedCourseIds: string[];
  onSuccess?: () => void;
}

export default function AddCourseModal({
  isOpen,
  onClose,
  user,
  subscribedCourseIds,
  onSuccess,
}: AddCourseModalProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [additionalAmount, setAdditionalAmount] = useState(10000);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("wave");
  const [geniusPhone, setGeniusPhone] = useState(user?.telephone || "");
  const [mode, setMode] = useState<Mode>('presentiel');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    if (user?.telephone && !geniusPhone) {
      setGeniusPhone(user.telephone);
    }

    Promise.allSettled([fetchCourses(), fetchAppSettings()]).then(([coursesRes, settingsRes]) => {
      if (coursesRes.status === "fulfilled") {
        setCourses(coursesRes.value || []);
      }
      if (settingsRes.status === "fulfilled" && settingsRes.value?.additionalCourseAmount) {
        setAdditionalAmount(settingsRes.value.additionalCourseAmount);
      }
      setLoading(false);
    });
  }, [isOpen, user]);

  // Exclure les cours déjà souscrits
  const availableCourses = useMemo(() => {
    return courses.filter((c) => !subscribedCourseIds.includes(c.id));
  }, [courses, subscribedCourseIds]);

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedCourses = useMemo(() => {
    return courses.filter((c) => selectedCourseIds.includes(c.id));
  }, [courses, selectedCourseIds]);

  const pays = user?.pays || "";
  const diaspora = isDiaspora(pays);
  const monthlyTotal = useMemo(() => {
    return selectedCourses.reduce((sum, c) => sum + courseMonthlyFee(c, pays, mode), 0);
  }, [selectedCourses, pays, mode]);

  // Montant total = mensualité(s) + frais supplémentaire (10 000 FCFA)
  const totalAmount = selectedCourses.length > 0 ? monthlyTotal + additionalAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourseIds.length === 0) {
      setError("Veuillez sélectionner au moins une formation à ajouter.");
      return;
    }
    if (!geniusPhone.trim()) {
      setError("Veuillez renseigner votre numéro de téléphone pour le paiement.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await addCourseForExistingStudent({
        courseIds: selectedCourseIds,
        paymentMethod,
        geniusPhone: geniusPhone.trim(),
        mode,
      });

      if (res.checkoutUrl) {
        // Redirection vers GeniusPay
        window.location.href = res.checkoutUrl;
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'inscription.");
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filtrer les méthodes de paiement GeniusPay
  const paymentMethodMap: Record<string, string> = {
    wave: "WAVE",
    orange: "ORANGE_MONEY",
    mtn: "MTN_MOMO",
    moov: "MOOV",
    card: "CARTE",
  };
  const availableMethods = paymentMethods
    .filter((p) => p.id !== "MOBILE_MONEY")
    .map((p) => ({
      id: Object.keys(paymentMethodMap).find((k) => paymentMethodMap[k] === p.id) || p.id.toLowerCase(),
      name: p.name,
      image: p.image,
    }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="p-6 bg-linear-to-r from-amber-500 to-[#c97e00] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-xs">
              <GraduationCap size={24} />
            </span>
            <div>
              <h3 className="font-black text-lg sm:text-xl">Ajouter une formation supplémentaire</h3>
              <p className="text-amber-100 text-xs mt-0.5">
                Tarif préférentiel exclusif pour étudiant déjà inscrit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Information badge tarif préférentiel */}
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
            <Sparkles size={20} className="text-[#c97e00] shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <div className="font-black text-sm text-[#7a4b00]">
                Avantage étudiant actif : Pas de frais d'inscription complets !
              </div>
              <p className="leading-relaxed">
                Vous êtes déjà membre de l'académie. Pour toute formation supplémentaire, les frais de dossier initiaux ne sont pas refacturés.
                Seul le <strong>tarif de formation supplémentaire (+{formatPrice(additionalAmount)} FCFA)</strong> s'ajoute à votre mensualité.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode de formation */}
          {!diaspora && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Mode de formation *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      mode === m.id
                        ? "border-[#c97e00] bg-amber-50 shadow-xs"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900">{m.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Choix des formations disponibles */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              1. Choisissez la formation à ajouter *
            </label>

            {loading ? (
              <div className="py-12 flex items-center justify-center text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#c97e00] mr-2" />
                <span className="text-sm">Chargement des formations disponibles...</span>
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-800">
                  Vous êtes déjà inscrit à toutes nos formations disponibles !
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Revenez plus tard pour de nouveaux concours et programmes.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {availableCourses.map((c) => {
                  const isSelected = selectedCourseIds.includes(c.id);
                  const mFee = courseMonthlyFee(c, pays, mode);

                  return (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#c97e00] bg-amber-50/60 shadow-xs"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCourse(c.id)}
                          className="w-5 h-5 accent-[#c97e00] rounded cursor-pointer"
                        />
                        <div>
                          <div className="font-black text-gray-900 text-sm">{c.title}</div>
                          <div className="text-[11px] text-gray-500">{c.category || "Général"}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#c97e00] block">
                          +{formatPrice(mFee)} FCFA/m
                        </span>
                        <span className="text-[10px] text-gray-400">mensualité</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Décomposition du tarif */}
          {selectedCourses.length > 0 && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Mensualité cours choisi :</span>
                <span className="font-semibold text-gray-900">{formatPrice(monthlyTotal)} FCFA</span>
              </div>
              <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Frais forfaitaire formation supplémentaire :</span>
                <span className="font-semibold text-emerald-700">+{formatPrice(additionalAmount)} FCFA</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Total à payer aujourd'hui :</span>
                <span className="font-black text-lg text-[#c97e00]">
                  {formatPrice(totalAmount)} FCFA
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Ce paiement valide immédiatement votre inscription au nouveau cours et règle son 1er mois.
              </p>
            </div>
          )}

          {/* Moyen de paiement */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              2. Moyen de paiement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableMethods.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? "border-[#c97e00] bg-amber-50 shadow-xs"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <img src={m.image} alt={m.name} className="h-6 w-auto object-contain" />
                  <span className="text-[11px] font-bold text-gray-800">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Numéro pour le paiement Mobile Money */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              3. Numéro de téléphone pour le débit *
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                required
                value={geniusPhone}
                onChange={(e) => setGeniusPhone(e.target.value)}
                placeholder="Ex: 0701020304"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:border-[#c97e00] focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Vous recevrez la notification de débit directement sur ce numéro.
            </p>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || selectedCourseIds.length === 0}
              className="flex items-center gap-2 bg-[#c97e00] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#7a4b00] transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Initialisation...</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Payer {selectedCourseIds.length > 0 ? `${formatPrice(totalAmount)} FCFA` : ""}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
