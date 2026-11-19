import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "../components/SEOHead";

export default function CGU() {
  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <SEOHead
        title="Conditions Générales d'Utilisation et de Vente"
        description="Conditions générales d'utilisation et de vente d'Excellence Académie : inscription, paiement, annulation, propriété intellectuelle et protection des données."
        url="/cgu"
      />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-gold-800 hover:text-gold-900 text-sm font-semibold mb-8 transition-colors" aria-label="Retour à l'accueil">
          <ArrowLeft size={16} aria-hidden="true" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 sm:p-10 md:p-12">
          <h1 className="text-2xl sm:text-3xl font-black text-ink-950 mb-2">Conditions Générales d'Utilisation et de Vente</h1>
          <p className="text-surface-600 text-sm mb-8">Dernière mise à jour : Novembre 2026</p>

          <div className="prose prose-sm max-w-none text-surface-700 space-y-6">
            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">1. Présentation</h2>
              <p>
                Excellence Académie SARL (ci-après « l'Établissement ») est une école de préparation aux concours
                administratifs basée à Abidjan, Cocody Angré, Côte d'Ivoire. Les présentes conditions régissent
                l'utilisation de la plateforme d'inscription, de paiement et de suivi des étudiants.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">2. Inscription</h2>
              <p>
                L'inscription à un programme de formation est validée après le paiement intégral des frais d'inscription.
                L'étudiant s'engage à fournir des informations exactes et complètes. Tout faux renseignement peut entraîner
                l'annulation de l'inscription sans remboursement.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">3. Paiement</h2>
              <p>
                Les paiements sont effectués via les moyens de paiement disponibles sur la plateforme (Wave, Orange Money,
                MTN MoMo, Moov Money, carte bancaire). Un reçu électronique est généré après chaque paiement validé.
                Les frais d'inscription ne sont pas remboursables sauf disposition contraire expressément prévue.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">4. Annulation et remboursement</h2>
              <p>
                Toute demande d'annulation doit être adressée par écrit à contact@exacademie.net avant le début des cours.
                Les frais d'inscription ne sont pas remboursables. Les mensualités déjà réglées ne sont remboursables
                qu'en cas d'annulation du programme par l'Établissement. Les modalités détaillées sont confirmées lors
                de l'inscription.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">5. Propriété intellectuelle</h2>
              <p>
                Tous les contenus pédagogiques mis à disposition (cours, supports, annales) sont la propriété exclusive
                d'Excellence Académie. Leur reproduction, distribution ou utilisation à des fins commerciales sans
                autorisation préalable est interdite.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">6. Protection des données</h2>
              <p>
                Les données personnelles collectées sont utilisées uniquement dans le cadre de la gestion des inscriptions
                et du suivi pédagogique. Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès,
                de rectification et de suppression de vos données. Pour toute demande, contactez-nous à
                {' '}contact@exacademie.net. Consultez notre{' '}
                <Link to="/politique-de-confidentialite" className="text-gold-800 font-semibold underline underline-offset-2">
                  politique de confidentialité
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">7. Cookies</h2>
              <p>
                Le site utilise des cookies nécessaires à son fonctionnement et, avec votre consentement, des cookies
                de mesure d'audience. Vous pouvez modifier vos choix à tout moment depuis la page{' '}
                <Link to="/preferences-cookies" className="text-gold-800 font-semibold underline underline-offset-2">
                  Préférences de cookies
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">8. Responsabilité</h2>
              <p>
                L'Établissement met en œuvre les moyens nécessaires à une préparation de qualité mais ne saurait garantir
                la réussite à un concours, celle-ci dépendant également du travail personnel de l'étudiant. L'Établissement
                ne peut être tenu responsable des interruptions de service dues à des tiers ou à des cas de force majeure.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">9. Droit applicable et litiges</h2>
              <p>
                Les présentes conditions sont régies par le droit ivoirien. En cas de litige, une solution amiable sera
                recherchée en priorité. À défaut, les tribunaux compétents d'Abidjan seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">10. Contact</h2>
              <p>
                Excellence Académie SARL<br />
                Abidjan, Cocody Angré, Terminus 81/82, RUE L162<br />
                Tél : 07 47 43 94 43 / 01 73 80 00 72<br />
                Email : contact@exacademie.net
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
