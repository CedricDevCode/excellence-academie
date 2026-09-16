import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Keyboard, Monitor, Volume2, Check } from "lucide-react";

export default function Accessibilite() {
  return (
    <div className="min-h-screen bg-gray-50 font-[Inter,sans-serif]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#0056B3] hover:text-[#003375] text-sm font-semibold mb-8 transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-black text-gray-900 mb-6">Accessibilité</h1>
          <p className="text-gray-500 text-sm mb-8">Dernière mise à jour : Septembre 2026</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">Notre engagement</h2>
              <p>
                Excellence Académie s'engage à rendre son site web accessible à tous, y compris aux personnes en situation
                de handicap. Nous travaillons en permanence pour améliorer l'accessibilité de notre plateforme conformément
                aux normes WCAG 2.1 niveau AA.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">Conformité</h2>
              <p>
                Nous nous efforçons de respecter les normes RGAA (Référentiel Général d'Amélioration de l'Accessibilité)
                et les Directives sur l'Accessibilité des Contenus Web (WCAG 2.1) publiées par le W3C.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">Fonctionnalités d'accessibilité</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <Eye size={20} className="text-[#0056B3] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Navigation par clavier</h3>
                    <p className="text-gray-600 text-xs mt-1">Toutes les fonctionnalités sont accessibles via Tab, Entrée et Échap.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <Keyboard size={20} className="text-[#0056B3] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Contraste élevé</h3>
                    <p className="text-gray-600 text-xs mt-1">Contraste de couleurs respectant les normes WCAG (ratio minimum 4.5:1).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <Monitor size={20} className="text-[#0056B3] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Responsive design</h3>
                    <p className="text-gray-600 text-xs mt-1">Interface adaptée à tous les écrans : mobile, tablette, ordinateur.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <Volume2 size={20} className="text-[#0056B3] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Textes alternatives</h3>
                    <p className="text-gray-600 text-xs mt-1">Toutes les images portentuses d'information disposent d'un texte alternatif.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">Pages accessibles</h2>
              <ul className="space-y-2">
                {["Inscription", "Connexion", "Tableau de bord étudiant", "Blog", "Boutique", "Contact"].map((page) => (
                  <li key={page} className="flex items-center gap-2">
                    <Check size={14} className="text-green-500 shrink-0" />
                    <span>{page}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">Améliorations en cours</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ajout de raccourcis clavier pour la navigation rapide</li>
                <li>Amélioration des formulaires pour les lecteurs d'écran</li>
                <li>Optimisation des aria-labels et landmarks</li>
                <li>Tests avec NVDA et VoiceOver</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 text-lg mb-3">Contact</h2>
              <p>
                Si vous rencontrez des difficultés d'accès à certaines parties du site ou si vous avez des suggestions
                d'amélioration, contactez-nous :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email : <strong>contact@exacademie.net</strong></li>
                <li>Téléphone : <strong>07 47 43 94 43</strong></li>
              </ul>
              <p>
                Nous nous engageons à répondre dans un délai de 5 jours ouvrés.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
