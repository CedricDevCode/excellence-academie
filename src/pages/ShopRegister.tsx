import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import api from "../utils/api";

export default function ShopRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/checkout';
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', telephone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.prenom || !form.nom || !form.email || !form.password || !form.telephone) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        password: form.password,
        telephone: form.telephone,
        role: 'STUDENT',
      });
      navigate(redirectTo);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/student/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B00] mb-6 transition-colors">
          <ArrowLeft size={16} /> Retour à la connexion
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6B00] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShoppingBag size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Créer un compte boutique</h1>
            <p className="text-gray-500 text-sm mt-1">Pour passer commande et suivre vos achats</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prénom *</label>
                <input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                  placeholder="Jean"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B00] focus:outline-none text-sm transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom *</label>
                <input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Kouamé"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B00] focus:outline-none text-sm transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="exemple@email.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B00] focus:outline-none text-sm transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mot de passe *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B00] focus:outline-none text-sm transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                  placeholder="07 01 02 03 04"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FF6B00] focus:outline-none text-sm transition-colors" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#FF6B00] hover:bg-[#e65c00] text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <User size={18} />}
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Déjà un compte ?{" "}
            <Link to={`/student/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#FF6B00] font-bold hover:text-[#e05e00]">
              Connectez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
