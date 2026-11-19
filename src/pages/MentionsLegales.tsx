import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "../components/SEOHead";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <SEOHead
        title="Mentions Légales"
        description="Mentions légales d'Excellence Académie : éditeur, directeur de la publication, hébergeur, propriété intellectuelle, données personnelles et droit applicable."
        url="/mentions-legales"
      />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-gold-800 hover:text-gold-900 text-sm font-semibold mb-8 transition-colors">
          <ArrowLeft size={16} aria-hidden="true" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 sm:p-10 md:p-12">
          <h1 className="text-2xl sm:text-3xl font-black text-ink-950 mb-2">Mentions Légales</h1>
          <p className="text-surface-600 text-sm mb-8">Dernière mise à jour : Novembre 2026</p>

          <div className="prose prose-sm max-w-none text-surface-700 space-y-6">

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">1. Éditeur du site</h2>
              <p>
                <strong>Excellence Académie SARL</strong><br />
                Capital social : 1 000 000 FCFA<br />
                Siège social : Abidjan, Cocody Angré, Terminus 81/82, RUE L162<br />
                RCCM : CI-ABJ-03-2025-B12-01298<br />
                Numéro de téléphone : 07 47 43 94 43 / 01 73 80 00 72<br />
                Email : contact@exacademie.net
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">2. Directeur de la publication</h2>
              <p>
                Le directeur de la publication est le représentant légal de Excellence Académie SARL.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">3. Hébergeur</h2>
              <p>
                Le site est hébergé par :<br />
                Hostinger International Ltd.<br />
                61 Lordou Vylonos, 6042 Larnaca, Chypre<br />
                Site web : <a href="https://www.hostinger.com" target="_blank" rel="noopener noreferrer" className="text-gold-800 hover:underline">www.hostinger.com</a>
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">4. Propriété intellectuelle</h2>
              <p>
                L'ensemble du contenu de ce site (textes, images, vidéos, logo, marques, etc.) est la propriété exclusive
                de Excellence Académie SARL ou de ses partenaires. Toute reproduction, représentation, modification,
                publication, transmission ou dénaturation du site ou de son contenu, par quelque procédé que ce soit,
                est interdite sans autorisation préalable écrite.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">5. Données personnelles</h2>
              <p>
                Conformément à la loi n°2013-450 du 19 juin 2013 relative à l'informatique, aux fichiers et aux libertés
                en Côte d'Ivoire, vous disposez d'un droit d'accès, de rectification et de suppression des données
                vous concernant. Pour exercer ce droit, contactez-nous à contact@exacademie.net.
              </p>
              <p>
                Consultez notre <Link to="/politique-de-confidentialite" className="text-gold-800 font-semibold hover:underline">Politique de Confidentialité</Link> pour plus de détails.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">6. Cookies</h2>
              <p>
                Ce site utilise des cookies pour améliorer l'expérience utilisateur et mesurer l'audience.
                Vous pouvez gérer vos préférences à tout moment via le bandeau de consentement ou notre page
                <Link to="/preferences-cookies" className="text-gold-800 font-semibold hover:underline"> Préférences de cookies</Link>.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">7. Limitation de responsabilité</h2>
              <p>
                Excellence Académie SARL s'efforce de fournir des informations aussi précises que possible sur le site.
                Toutefois, elle ne pourra être tenue responsable des omissions, des inexactitudes et des carences dans la
                mise à jour.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-ink-950 text-lg mb-3">8. Droit applicable</h2>
              <p>
                Les présentes mentions légales sont régies par le droit ivoirien. En cas de litige, les tribunaux
                compétents d'Abidjan seront seuls compétents.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
