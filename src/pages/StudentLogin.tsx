import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, ArrowLeft, Lock, User, AlertCircle, Loader2 } from "lucide-react";

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function StudentLogin() {
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.email.trim()) errs.email = "L'email est requis.";
    else if (!validateEmail(form.email.trim())) errs.email = "Format d'email invalide.";
    if (!form.password) errs.password = "Le mot de passe est requis.";
    else if (form.password.length < 4) errs.password = "Mot de passe trop court.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      const data = await response.json();

      if (response.ok) {
        const role = data.user.role;
        const adminRoles: Record<string, string[]> = { student: ['STUDENT'], teacher: ['TEACHER'], accountant: ['ACCOUNTANT'], admin: ['ADMIN', 'SECRETARY'] };
        if (!adminRoles[form.role]?.includes(role)) {
          const labels: Record<string, string> = { student: 'étudiant', teacher: 'enseignant', accountant: 'comptable', admin: 'administrateur' };
          setServerError(`Ce compte n'est pas un ${labels[form.role] || form.role}. Veuillez sélectionner le bon profil.`);
          return;
        }
        if (redirectTo && role === 'STUDENT') {
          navigate(redirectTo);
        } else if (role === "ADMIN") navigate("/admin/dashboard");
        else if (role === "SECRETARY") navigate("/secretary/dashboard");
        else if (role === "STUDENT") navigate("/student/dashboard");
        else if (role === "TEACHER") navigate("/teacher/dashboard");
        else if (role === "ACCOUNTANT") navigate("/accountant/dashboard");
      } else {
        const errorMsg = data.details
          ? `${data.error} (${data.details})`
          : (data.error || 'Email ou mot de passe incorrect.');
        setServerError(errorMsg);
      }
    } catch {
      setServerError('Erreur de connexion au serveur. Vérifiez que le backend est démarré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0056B3] to-[#003375] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 text-blue-200 hover:text-white mb-8 transition-colors text-sm" aria-label="Retour à l'accueil">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#0056B3] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-black text-xl">EA</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">Connexion</h1>
            <p className="text-gray-500 text-sm mt-1">Excellence Académie – Espace personnel</p>
          </div>

          {serverError && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Je me connecte en tant que</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: "student", label: "Étudiant", icon: <GraduationCap size={14} /> },
                  { val: "teacher", label: "Enseignant", icon: <User size={14} /> },
                  { val: "accountant", label: "Comptable", icon: <Lock size={14} /> },
                  { val: "admin", label: "Administrateur", icon: <Lock size={14} /> },
                ].map(r => (
                  <button key={r.val} type="button"
                    onClick={() => setForm({ ...form, role: r.val })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${form.role === r.val ? "border-[#0056B3] bg-blue-50 text-[#0056B3]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-2">Email ou identifiant</label>
              <input id="login-email" type="email" value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
                placeholder="votre@email.com"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-sm transition-colors ${errors.email ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#0056B3]"}`}
                aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
              {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe</label>
              <div className="relative">
                <input id="login-password" type={showPass ? "text" : "password"} value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-sm pr-10 transition-colors ${errors.password ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#0056B3]"}`}
                  aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#0056B3] hover:bg-[#003375] text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-500 text-sm">
              Pas encore de compte ?{" "}
              <Link to={`/shop/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#FF6B00] font-bold hover:text-[#e05e00]">
                Créer un compte boutique
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Vous êtes un étudiant ?{" "}
              <Link to={`/students/new${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#0056B3] font-bold hover:underline">
                Inscrivez-vous à une formation
              </Link>
            </p>
            <p className="text-gray-400 text-xs">
              Mot de passe oublié ? Contactez-nous au{" "}
              <a href="tel:+2250747439443" className="text-[#0056B3] hover:underline">07 47 43 94 43</a>
            </p>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2026 Excellence Académie • RCCM : CI-ABJ-03-2025-B12-01298
        </p>
      </div>
    </div>
  );
}

