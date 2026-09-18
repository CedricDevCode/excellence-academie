import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-gray-50 font-[Inter,sans-serif]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#c97e00] hover:text-[#6b4500] text-sm font-semibold mb-8 transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-black text-gray-900 mb-6">Politique de Confidentialité</h1>
          <p className="text-gray-500 text-sm mb-8">Dernière mise à jour : Septembre 2026</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">1. Responsable du traitement</h2>
              <p>
                Le responsable du traitement des données personnelles est :<br />
                <strong>Excellence Académie SARL</strong><br />
                Email : contact@exacademie.net<br />
                Téléphone : 07 47 43 94 43
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">2. Données collectées</h2>
              <p>Nous collectons les données suivantes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données d'inscription</strong> : nom, prénom, date de naissance, email, téléphone, ville, photo</li>
                <li><strong>Données de connexion</strong> : adresse IP, navigateur, système d'exploitation</li>
                <li><strong>Données de paiement</strong> : historique des transactions (montant, date, statut)</li>
                <li><strong>Données de formation</strong> : cours suivis, notes, présences, évaluations</li>
                <li><strong>Cookies</strong> : identifiant de session, préférences utilisateur</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">3. Finalités du traitement</h2>
              <p>Vos données sont collectées pour :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>La gestion des inscriptions et le suivi pédagogique</li>
                <li>Le traitement des paiements et la gestion financière</li>
                <li>L'envoi de notifications relatives à vos cours et échéances</li>
                <li>La communication relative au service (rappels, nouveautés)</li>
                <li>L'amélioration de nos services et de l'expérience utilisateur</li>
                <li>Le respect de nos obligations légales et réglementaires</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">4. Base légale du traitement</h2>
              <p>Le traitement de vos données repose sur :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>L'exécution du contrat d'inscription</li>
                <li>Votre consentement (cookies, newsletter)</li>
                <li>Notre intérêt légitime (amélioration du service, sécurité)</li>
                <li>Nos obligations légales (conservation des factures, comptabilité)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">5. Durée de conservation</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données d'inscription</strong> : durée de la formation + 3 ans</li>
                <li><strong>Données financières</strong> : 10 ans (obligation comptable)</li>
                <li><strong>Cookies</strong> : 13 mois maximum</li>
                <li><strong>Données de connexion</strong> : 1 an</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">6. Partage des données</h2>
              <p>Vos données peuvent être partagées avec :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>GeniusPay</strong> : pour le traitement des paiements en ligne</li>
                <li><strong>Hostinger</strong> : pour l'hébergement des données</li>
                <li><strong>Les autorités compétentes</strong> : en cas d'obligation légale</li>
              </ul>
              <p>Nous ne vendons jamais vos données à des tiers.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">7. Vos droits</h2>
              <p>Conformément à la réglementation en vigueur, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
                <li><strong>Droit de suppression</strong> : demander la suppression de vos données</li>
                <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
                <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              </ul>
              <p>
                Pour exercer vos droits, contactez-nous à : <strong>contact@exacademie.net</strong>
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">8. Sécurité</h2>
              <p>
                Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données
                contre tout accès non autorisé, altération, divulgation ou destruction.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">9. Modifications</h2>
              <p>
                Cette politique peut être mise à jour à tout moment. Nous vous informerons de tout changement
                significatif par email ou via une notification sur le site.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
