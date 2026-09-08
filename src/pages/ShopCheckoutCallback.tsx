import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export default function ShopCheckoutCallback() {
  const location = useLocation();
  const isSuccess = location.pathname.includes('/success');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'verifying'>('verifying');

  useEffect(() => {
    const checkStatus = async () => {
      const searchParams = new URLSearchParams(location.search);
      const reference = searchParams.get('reference');

      if (!reference) {
        setStatus(isSuccess ? 'success' : 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/payments/geniuspay/status/${reference}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to verify payment');
        const data = await response.json();

        if (data.status === 'completed' || data.status === 'success') {
          setStatus('success');
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setStatus('error');
        } else {
          // Keep verifying or show pending
          setStatus('success'); // Usually if they are here, it's successful or pending webhook
        }
      } catch (error) {
        console.error('Erreur de vérification', error);
        setStatus(isSuccess ? 'success' : 'error');
      }
    };

    checkStatus();
  }, [location, isSuccess]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'verifying' ? (
          <div>
            <div className="w-16 h-16 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#002855] mb-2">Vérification...</h2>
            <p className="text-gray-600">Veuillez patienter pendant que nous confirmons votre paiement.</p>
          </div>
        ) : status === 'success' ? (
          <div>
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-[#002855] mb-4">Commande Réussie !</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Votre commande a été traitée avec succès. Vous recevrez un email de confirmation très bientôt.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Connectez-vous à votre espace pour suivre l'évolution de votre commande.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/student/login"
                className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 bg-[#FF6B00] hover:bg-[#e65c00] text-white rounded-xl font-bold transition-all"
              >
                <ShoppingBag size={18} /> Suivre ma commande
              </Link>
              <Link
                to="/"
                className="inline-block w-full py-4 px-6 border-2 border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white rounded-xl font-bold transition-all"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-[#002855] mb-4">Paiement Échoué</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Une erreur est survenue lors du paiement de votre commande. Veuillez réessayer.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/shop"
                className="inline-block w-full py-4 px-6 bg-[#FF6B00] hover:bg-[#e65c00] text-white rounded-xl font-bold transition-all"
              >
                Retour à la Boutique
              </Link>
              <Link
                to="/"
                className="inline-block w-full py-4 px-6 border-2 border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white rounded-xl font-bold transition-all"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
