import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { confirmPayment } from "../utils/api";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlReference = searchParams.get("reference");
  const storedReference = sessionStorage.getItem('geniuspay_reference');
  const reference = urlReference || storedReference || '';
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setError("Aucune référence de transaction fournie.");
      return;
    }
    sessionStorage.removeItem('geniuspay_reference');
    sessionStorage.removeItem('geniuspay_email');
    confirmPayment(reference)
      .then((data) => {
        if (data.success) {
          setStatus("success");
          const role = data.user?.role || 'STUDENT';
          if (role === "ADMIN") navigate("/admin/dashboard");
          else if (role === "TEACHER") navigate("/teacher/dashboard");
          else if (role === "ACCOUNTANT") navigate("/accountant/dashboard");
          else navigate("/student/dashboard");
        } else {
          setStatus("failed");
          setError(data.message || "Le paiement n'a pas abouti.");
        }
      })
      .catch((err: Error) => {
        setStatus("failed");
        setError(err.message || "Impossible de vérifier le statut du paiement.");
      });
  }, [reference]);

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
            <h1 className="font-black text-gray-900 text-xl mb-2">Vérification du paiement...</h1>
            <p className="text-gray-500 text-sm">Veuillez patienter pendant que nous confirmons votre transaction.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h1 className="font-black text-gray-900 text-xl mb-2">Paiement réussi !</h1>
            <p className="text-gray-500 text-sm mb-6">
              Le paiement a été confirmé. L'inscription est maintenant active.
            </p>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft size={16} /> Accéder à mon espace
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={48} className="text-red-500" />
            </div>
            <h1 className="font-black text-gray-900 text-xl mb-2">Paiement non confirmé</h1>
            <p className="text-gray-500 text-sm mb-2">{error || "Le paiement n'a pas abouti."}</p>
            <p className="text-gray-400 text-xs mb-6">Référence : {reference}</p>
            <button
              onClick={() => navigate("/students/new")}
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={16} /> Réessayer l'inscription
            </button>
          </>
        )}
      </div>
    </div>
  );
}

