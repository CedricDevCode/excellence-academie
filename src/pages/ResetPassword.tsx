import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { resetPassword } from "../utils/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) { setError('Lien invalide. Demandez un nouveau lien de réinitialisation.'); return; }
    if (newPassword.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/student/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors">
          <ArrowLeft size={16} /> Retour à la connexion
        </Link>

        <div className="bg-white rounded shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Nouveau mot de passe</h1>
            <p className="text-gray-500 text-sm mt-1">Choisissez un mot de passe sécurisé.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h3 className="font-bold text-green-700 text-lg mb-2">Mot de passe modifié !</h3>
              <p className="text-gray-500 text-sm mb-6">
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Link to="/student/login"
                className="inline-block py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded transition-all shadow-lg">
                Se connecter
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center py-4">
              <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm mb-4">Lien de réinitialisation invalide ou manquant.</p>
              <Link to="/forgot-password" className="text-primary-600 font-bold text-sm hover:underline">
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nouveau mot de passe *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded focus:border-primary-600 focus:outline-none text-sm transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmer le mot de passe *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded focus:border-primary-600 focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-black rounded transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
