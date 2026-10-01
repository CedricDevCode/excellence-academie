import { Link } from "react-router-dom";
import { Lock, ArrowRight, Home } from "lucide-react";
import { Button, Container } from "./ui";

interface BlogRestrictedProps {
  status?: number;
}

export default function BlogRestricted({ status }: BlogRestrictedProps) {
  const disabled = status === 403;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 flex items-center justify-center px-4">
      <Container className="max-w-md w-full">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center mx-auto mb-5">
            <Lock size={26} />
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-3">
            {disabled ? "Accès refusé" : "Blog réservé aux inscrits"}
          </h1>

          <p className="text-sm text-slate-500 leading-relaxed mb-7">
            {disabled
              ? "Votre compte est désactivé. Contactez l'administration pour réactiver votre accès au blog."
              : "Le blog est réservé aux étudiants inscrits et actifs. Connectez-vous avec votre compte pour y accéder."}
          </p>

          {!disabled && (
            <Link to="/student/login" className="block mb-3">
              <Button variant="accent" size="md" className="w-full justify-center" iconRight={<ArrowRight size={16} />}>
                Se connecter
              </Button>
            </Link>
          )}

          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors">
            <Home size={15} /> Retour à l'accueil
          </Link>
        </div>
      </Container>
    </div>
  );
}
