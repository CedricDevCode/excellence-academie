import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import StudentRegistrationForm from "../components/StudentRegistrationForm";

export default function StudentRegister() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 w-[420px] h-[420px] bg-accent-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors text-sm" aria-label="Retour à l'accueil">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded shadow-xl border border-surface-100 overflow-hidden"
        >
          <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-surface-100">
            <img src="/images/logo%20exacademy.jpeg" alt="Excellence Académie" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-100" />
            <div>
              <h1 className="font-black text-xl text-surface-900">Inscription</h1>
              <p className="text-surface-500 text-sm">Rejoignez 500+ étudiants qui réussissent</p>
            </div>
          </div>

          <div className="p-8">
            <StudentRegistrationForm redirectTo={redirectTo} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}