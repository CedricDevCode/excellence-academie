import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CGU() {
  return (
    <div className="min-h-screen bg-gray-50 font-[Inter,sans-serif]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#0056B3] hover:text-[#003375] text-sm font-semibold mb-8 transition-colors" aria-label="Retour à l'accueil">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-black text-gray-900 mb-6">Conditions Générales d'Utilisation</h1>
          <p className="text-gray-500 text-sm mb-8">Dernière mise à jour : Juin 2026</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">1. Présentation</h2>
              <p>
                Excellence Académie SARL (ci-après "l'Établissement") est une école de préparation aux concours administratifs
                basée à Abidjan, Cocody Angré, Côte d'Ivoire. Les présentes conditions régissent l'utilisation de la plateforme
                d'inscription et de suivi des étudiants.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">2. Inscription</h2>
              <p>
                L'inscription à un programme de formation est validée après le paiement intégral des frais d'inscription.
                L'étudiant s'engage à fournir des informations exactes et complètes. Tout faux renseignement peut entraîner
                l'annulation de l'inscription sans remboursement.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">3. Paiement</h2>
              <p>
                Les paiements sont effectués via les moyens de paiement disponibles sur la plateforme (Wave, Orange Money,
                MTN MoMo, Moov Money, Carte bancaire). Un reçu électronique est généré après chaque paiement validé.
                Les frais d'inscription ne sont pas remboursables sauf disposition contraire expressément prévue.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">4. Propriété intellectuelle</h2>
              <p>
                Tous les contenus pédagogiques mis à disposition (cours, supports, annales) sont la propriété exclusive
                d'Excellence Académie. Leur reproduction, distribution ou utilisation à des fins commerciales sans
                autorisation préalable est interdite.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">5. Protection des données</h2>
              <p>
                Les données personnelles collectées sont utilisées uniquement dans le cadre de la gestion des inscriptions
                et du suivi pédagogique. Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès,
                de rectification et de suppression de vos données. Pour toute demande, contactez-nous à ea@exacademie.com.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">6. Contact</h2>
              <p>
                Excellence Académie SARL<br />
                Abidjan, Cocody Angré, Terminus 81/82, RUE L162<br />
                Tél : 07 47 43 94 43 / 01 73 80 00 72<br />
                Email : ea@exacademie.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
