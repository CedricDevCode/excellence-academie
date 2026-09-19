import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { forgotPassword } from "../utils/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email requis'); return; }
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
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
              <Mail size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Mot de passe oublié</h1>
            <p className="text-gray-500 text-sm mt-1">Entrez votre email pour recevoir un lien de réinitialisation.</p>
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
              <h3 className="font-bold text-green-700 text-lg mb-2">Email envoyé !</h3>
              <p className="text-gray-500 text-sm mb-6">
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
                Vérifiez également vos spams.
              </p>
              <Link to="/student/login" className="text-primary-600 font-bold text-sm hover:underline">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse email *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded focus:border-primary-600 focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-black rounded transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center text-gray-500 text-sm mt-6">
              <Link to="/student/login" className="text-primary-600 font-bold hover:text-primary-700">
                Retour à la connexion
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
