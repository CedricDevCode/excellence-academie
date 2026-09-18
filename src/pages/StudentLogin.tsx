import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, ArrowLeft, Lock, User, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

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
        localStorage.setItem('user', JSON.stringify(data.user));
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
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Brand glows */}
      <div className="absolute -top-32 -left-24 w-[420px] h-[420px] bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] bg-accent-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm" aria-label="Retour à l'accueil">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded shadow-xl border border-surface-100 p-8"
        >
          <div className="flex items-center gap-3 mb-8">
            <img src="/images/logo%20exacademy.jpeg" alt="Excellence Académie" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-100" />
            <div>
              <h1 className="text-xl font-black text-surface-900">Connexion</h1>
              <p className="text-surface-500 text-sm">Excellence Académie – Espace personnel</p>
            </div>
          </div>

          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-5 bg-red-50 border border-red-200 rounded p-3.5 flex items-start gap-2.5"
              role="alert"
            >
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-xs leading-relaxed">{serverError}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-bold text-surface-900 mb-2">Je me connecte en tant que</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: "student", label: "Étudiant", icon: <GraduationCap size={14} /> },
                  { val: "teacher", label: "Enseignant", icon: <User size={14} /> },
                  { val: "accountant", label: "Comptable", icon: <Lock size={14} /> },
                  { val: "admin", label: "Administrateur", icon: <ShieldCheck size={14} /> },
                ].map(r => (
                  <button key={r.val} type="button"
                    onClick={() => setForm({ ...form, role: r.val })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded text-xs font-bold transition-all duration-200 ${form.role === r.val ? "bg-accent-500 text-white shadow-sm" : "bg-surface-50 text-surface-600 border border-surface-200 hover:border-surface-300"}`}>
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="login-email" className="block text-sm font-bold text-surface-900 mb-1.5">Email ou identifiant</label>
              <input id="login-email" type="email" value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
                placeholder="votre@email.com"
                className={`w-full px-3.5 py-2.5 border rounded focus:outline-none text-sm focus:ring-2 transition-shadow ${errors.email ? "border-red-400 focus:ring-red-100" : "border-surface-200 focus:border-surface-900 focus:ring-surface-100"}`}
                aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
              {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-bold text-surface-900 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input id="login-password" type={showPass ? "text" : "password"} value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 border rounded focus:outline-none text-sm pr-10 focus:ring-2 transition-shadow ${errors.password ? "border-red-400 focus:ring-red-100" : "border-surface-200 focus:border-surface-900 focus:ring-surface-100"}`}
                  aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors" aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-white font-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-surface-100 text-center space-y-2.5">
            <p className="text-surface-500 text-sm">
              Pas encore de compte ?{" "}
              <Link to={`/shop/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-accent-600 font-bold hover:text-accent-700 transition-colors">
                Créer un compte boutique
              </Link>
            </p>
            <p className="text-surface-400 text-xs">
              Vous êtes un étudiant ?{" "}
              <Link to={`/students/new${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-primary-600 font-bold hover:underline">
                Inscrivez-vous à une formation
              </Link>
            </p>
            <p className="text-surface-400 text-xs">
              Mot de passe oublié ? Contactez-nous au{" "}
              <a href="tel:+2250747439443" className="text-primary-600 hover:underline">07 47 43 94 43</a>
            </p>
          </div>
        </motion.div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 Excellence Académie • RCCM : CI-ABJ-03-2025-B12-01298
        </p>
      </div>
    </div>
  );
}