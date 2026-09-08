import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StudentRegistrationForm from "../components/StudentRegistrationForm";

export default function StudentRegister() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0056B3] to-[#003375] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors text-sm" aria-label="Retour à l'accueil">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-linear-to-r from-[#0056B3] to-[#003375] p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black">EA</div>
              <div>
                <h1 className="font-black text-xl">Inscription – Excellence Académie</h1>
                <p className="text-blue-200 text-sm">Rejoignez 500+ étudiants qui réussissent</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <StudentRegistrationForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </div>
  );
}

