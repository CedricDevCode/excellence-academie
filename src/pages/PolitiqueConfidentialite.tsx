import { Link } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import SEOHead from "../components/SEOHead";
import { useCookies } from "../components/CookieConsent";

export default function PolitiqueConfidentialite() {
  const cookies = useCookies();

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <SEOHead
        title="Politique de Confidentialité"
        description="Politique de confidentialité d'Excellence Académie : données collectées, finalités, cookies, mesure d'audience, durée de conservation et droits des utilisateurs."
        url="/politique-de-confidentialite"
      />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-gold-800 hover:text-gold-900 text-sm font-semibold mb-8 transition-colors">
          <ArrowLeft size={16} aria-hidden="true" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 sm:p-10 md:p-12">
          <h1 className="text-2xl sm:text-3xl font-black text-ink-950 mb-2">Politique de Confidentialité</h1>
          <p className="text-surface-600 text-sm mb-8">Dernière mise à jour : Novembre 2026</p>

          <div className="prose prose-sm max-w-none text-surface-700 space-y-6">

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">1. Responsable du traitement</h2>
              <p>
                Le responsable du traitement des données personnelles est :<br />
                <strong>Excellence Académie SARL</strong><br />
                Abidjan, Cocody Angré, Terminus 81/82, RUE L162, Côte d'Ivoire<br />
                Email : contact@exacademie.net<br />
                Téléphone : 07 47 43 94 43
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">2. Données collectées</h2>
              <p>Nous collectons les données suivantes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données d'inscription</strong> : nom, prénom, date de naissance, email, téléphone, ville, photo</li>
                <li><strong>Données de connexion</strong> : adresse IP, navigateur, système d'exploitation</li>
                <li><strong>Données de paiement</strong> : historique des transactions (montant, date, statut)</li>
                <li><strong>Données de formation</strong> : cours suivis, notes, présences, évaluations</li>
                <li><strong>Cookies</strong> : identifiant de session, préférences utilisateur, mesure d'audience</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">3. Finalités du traitement</h2>
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
              <h2 className="font-bold text-ink-950 text-lg mb-3">4. Base légale du traitement</h2>
              <p>Le traitement de vos données repose sur :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>L'exécution du contrat d'inscription</li>
                <li>Votre consentement (cookies, newsletter)</li>
                <li>Notre intérêt légitime (amélioration du service, sécurité)</li>
                <li>Nos obligations légales (conservation des factures, comptabilité)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">5. Durée de conservation</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données d'inscription</strong> : durée de la formation + 3 ans</li>
                <li><strong>Données financières</strong> : 10 ans (obligation comptable)</li>
                <li><strong>Cookies</strong> : 13 mois maximum</li>
                <li><strong>Données de connexion</strong> : 1 an</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">6. Partage des données</h2>
              <p>Vos données peuvent être partagées avec :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>GeniusPay</strong> : pour le traitement des paiements en ligne</li>
                <li><strong>Hostinger</strong> : pour l'hébergement des données</li>
                <li><strong>Google Analytics</strong> : mesure d'audience anonymisée, uniquement si vous acceptez les cookies statistiques</li>
                <li><strong>Les autorités compétentes</strong> : en cas d'obligation légale</li>
              </ul>
              <p>Nous ne vendons jamais vos données à des tiers.</p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">7. Vos droits</h2>
              <p>Conformément à la réglementation en vigueur, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
                <li><strong>Droit de suppression</strong> : demander la suppression de vos données</li>
                <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
                <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              </ul>
              <p>
                Pour exercer vos droits, contactez-nous à : <strong>contact@exacademie.net</strong>. Vous pouvez
                également saisir l'Autorité de Régulation des Télécommunications de Côte d'Ivoire (ARTCI).
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">8. Cookies et mesure d'audience</h2>
              <p>
                Le site utilise trois catégories de cookies :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Nécessaires</strong> : session, authentification, panier et sécurité. Ils sont toujours actifs.</li>
                <li><strong>Statistiques</strong> : Google Analytics 4, avec anonymisation de l'adresse IP. Ils ne sont déposés qu'après votre consentement.</li>
                <li><strong>Marketing</strong> : désactivés par défaut et non utilisés sans consentement explicite.</li>
              </ul>
              <p>
                Votre choix est conservé pendant 13 mois maximum. Vous pouvez le modifier à tout moment.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => cookies?.openSettings()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold-800 text-white text-sm font-bold rounded-lg hover:bg-gold-900 transition-colors cursor-pointer"
                >
                  <Settings size={16} aria-hidden="true" />
                  Gérer mes cookies
                </button>
                <Link
                  to="/preferences-cookies"
                  className="inline-flex items-center px-4 py-2.5 border-2 border-surface-300 text-ink-900 text-sm font-bold rounded-lg hover:bg-surface-100 transition-colors"
                >
                  Page des préférences
                </Link>
              </div>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">9. Sécurité</h2>
              <p>
                Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données
                contre tout accès non autorisé, altération, divulgation ou destruction. Le site est servi exclusivement
                en HTTPS.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">10. Modifications</h2>
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
