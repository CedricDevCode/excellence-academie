export interface BlogPostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  createdAt: string;
  author: {
    id?: string;
    name: string;
    role: string;
    avatar: string;
  };
  tags: { tag: { id: string; name: string } }[];
  _count?: {
    comments: number;
    exercises: number;
  };
  comments?: Array<{
    id: string;
    author: { name: string; role?: string };
    content: string;
    createdAt: string;
  }>;
  exercises?: Array<{
    id: string;
    title: string;
    description: string;
    fileUrl?: string;
  }>;
}

export const DEFAULT_BLOG_POSTS: BlogPostItem[] = [
  {
    id: "default-post-1",
    slug: "reussir-concours-magistrature-cote-ivoire-guide-complet",
    title: "Comment réussir le Concours de la Magistrature : Stratégie, Méthodologie et Erreurs à éviter",
    excerpt: "Le concours de la Magistrature est l'un des plus sélectifs. Découvrez la méthode éprouvée par nos lauréats pour dominer la dissertation juridique, le cas pratique et l'épreuve orale.",
    readingTime: "7 min de lecture",
    category: "Magistrature",
    publishedAt: "2026-09-12T10:00:00.000Z",
    createdAt: "2026-09-12T10:00:00.000Z",
    coverImage: "/images/image2.jpeg",
    author: {
      name: "Dr. Konan Kouamé",
      role: "Magistrat & Formateur Référent",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    },
    tags: [
      { tag: { id: "t1", name: "Magistrature" } },
      { tag: { id: "t2", name: "Droit Privé" } },
      { tag: { id: "t3", name: "Méthodologie" } },
      { tag: { id: "t4", name: "Grand Oral" } }
    ],
    _count: {
      comments: 6,
      exercises: 2
    },
    comments: [
      {
        id: "c1",
        author: { name: "Ange Kassi", role: "Auditeur de justice (Lauréat 2025)" },
        content: "Cette méthode m'a permis d'obtenir 16/20 en droit civil des obligations ! Ne sous-estimez jamais la problématisation de l'introduction.",
        createdAt: "2026-09-13T14:30:00.000Z"
      },
      {
        id: "c2",
        author: { name: "Christelle Diomandé", role: "Candidate 2026" },
        content: "Merci beaucoup pour ces conseils précieux. La partie sur la gestion du temps pendant l'épreuve de 5 heures est salvatrice.",
        createdAt: "2026-09-14T09:15:00.000Z"
      }
    ],
    exercises: [
      {
        id: "ex1",
        title: "Épreuve Blanche : Sujet de dissertation juridique (Droit des contrats)",
        description: "« Le consentement éclairé dans les contrats électroniques contemporains ». Proposez une introduction complète comprenant accroche, définition, délimitation, intérêt, problématique et annonce de plan binaire.",
      },
      {
        id: "ex2",
        title: "Cas pratique : Responsabilité civile délictuelle du commettant",
        description: "Analysez la situation où le préposé utilise le véhicule de fonction en dehors des heures de service. Déterminez les recours possibles de la victime.",
      }
    ],
    content: `
      <h2>1. Comprendre les attentes fondamentales du jury</h2>
      <p>Le concours de recrutement des auditeurs de justice ne teste pas uniquement votre mémoire, mais avant tout votre rigueur logique, votre neutralité d'analyse et votre capacité à qualifier juridiquement les faits.</p>
      <p>Un candidat moyen récite des articles de loi ; un futur magistrat expose les tensions jurisprudentielles, compare les doctrines et formule une solution étayée et équilibrée.</p>

      <h2>2. La méthode infaillible de la dissertation juridique</h2>
      <p>Le plan doit obligatoirement être structuré en <strong>deux parties et deux sous-parties (I-A, I-B, II-A, II-B)</strong>, selon la tradition juridique francophone. Voici les 3 règles d'or :</p>
      <ul>
        <li><strong>L'intitulé des parties :</strong> Évitez les verbes conjugués. Utilisez des substantifs qualifiés, percutants et révélateurs du problème de droit.</li>
        <li><strong>La transition :</strong> Entre chaque partie et sous-partie, rédigez un chapeau introductif annonçant la suite sans rupture logique.</li>
        <li><strong>L'actualité jurisprudentielle :</strong> Citez toujours les réformes récentes du Code de procédure civile et les arrêts majeurs de la Cour de Cassation et du Conseil d'État.</li>
      </ul>

      <h2>3. L'épreuve orale : Dominer le stress</h2>
      <p>Devant le jury, votre posture professionnelle compte pour 40% de la note finale. Tenez-vous droit, exprimez-vous avec clarté, ne coupez jamais la parole aux examinateurs, et sachez reconnaître avec élégance une hésitation plutôt que d'improviser une affirmation erronée.</p>

      <blockquote>
        « Le doute est le commencement de la sagesse du juge, mais la rigueur méthodique en est la garantie quotidienne. »
      </blockquote>
    `
  },
  {
    id: "default-post-2",
    slug: "preparer-le-concours-ena-cycle-superieur-methodologie-dissertation",
    title: "Concours ENA : Maîtriser la note de synthèse et la culture générale administrative",
    excerpt: "La note de synthèse élimine plus de 60% des candidats à l'ENA. Voici la feuille de route chronométrée pour synthétiser un dossier de 30 pages en 3 heures chrono.",
    readingTime: "5 min de lecture",
    category: "ENA",
    publishedAt: "2026-09-08T08:30:00.000Z",
    createdAt: "2026-09-08T08:30:00.000Z",
    coverImage: "/images/image3.jpeg",
    author: {
      name: "Mme Salimata Traoré",
      role: "Ancienne Énarque & Consultante RH Public",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
    },
    tags: [
      { tag: { id: "t5", name: "ENA" } },
      { tag: { id: "t6", name: "Note de Synthèse" } },
      { tag: { id: "t7", name: "Administration Publique" } },
      { tag: { id: "t8", name: "Culture Générale" } }
    ],
    _count: {
      comments: 4,
      exercises: 1
    },
    comments: [
      {
        id: "c3",
        author: { name: "Marc N'Goran", role: "Admis ENA Cycle Supérieur" },
        content: "Le tableau de dépouillement en 45 minutes a changé ma vie. Sans cette technique, on se noie littéralement dans les annexes du dossier.",
        createdAt: "2026-09-09T18:00:00.000Z"
      }
    ],
    exercises: [
      {
        id: "ex3",
        title: "Simulation Note de Synthèse : Digitalisation des services fiscaux",
        description: "Rédigez la note de synthèse à l'attention du Ministre de l'Économie en respectant scrupuleusement le style impersonnel administratif et la contrainte de 4 pages maximum.",
      }
    ],
    content: `
      <h2>1. Qu'est-ce que la Note de Synthèse pour l'ENA ?</h2>
      <p>La note de synthèse n'est ni un résumé de texte, ni un commentaire d'opinion. C'est un document d'aide à la décision administrative, destiné à une autorité supérieure qui n'a pas le temps d'étudier l'ensemble des pièces brutes.</p>

      <h2>2. Le découpage horaire strict (3 heures au total)</h2>
      <ul>
        <li><strong>0h00 à 0h15 :</strong> Prise de connaissance du sujet et inventaire rapide du dossier (titres, dates, auteurs des documents).</li>
        <li><strong>0h15 à 1h15 :</strong> Lecture sélective et remplissage du tableau croisé de dépouillement.</li>
        <li><strong>1h15 à 1h45 :</strong> Construction du plan détaillé et de la problématique.</li>
        <li><strong>1h45 à 2h45 :</strong> Rédaction directe au propre (évitez le brouillon intégral).</li>
        <li><strong>2h45 à 3h00 :</strong> Relecture orthographique et vérification des renvois aux documents.</li>
      </ul>

      <h2>3. Les 4 erreurs rédhibitoires</h2>
      <p>1. Donner son avis personnel ou faire intervenir des connaissances extérieures au dossier.<br/>
      2. Oublier de mentionner les sources documentaires (Doc. 1, Doc. 4...).<br/>
      3. Dépasser le volume préconisé (généralement 4 à 5 pages manuscrites).<br/>
      4. Négliger le style administratif (sobriété, clarté, tournures neutres).</p>
    `
  },
  {
    id: "default-post-3",
    slug: "concours-greffe-organisation-droit-judiciaire",
    title: "Concours des Greffes : Les pièges classiques de procédure civile et de rédaction d'actes",
    excerpt: "Procédure d'assignation, tenue des registres et rôle d'officier ministériel : analyse détaillée des sujets tombés lors des dernières sessions du concours.",
    readingTime: "6 min de lecture",
    category: "Greffe",
    publishedAt: "2026-09-02T11:00:00.000Z",
    createdAt: "2026-09-02T11:00:00.000Z",
    coverImage: "/images/images4.jpeg",
    author: {
      name: "Me Jean-Luc Bédié",
      role: "Greffier en Chef & Formateur",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    },
    tags: [
      { tag: { id: "t9", name: "Greffe" } },
      { tag: { id: "t10", name: "Procédure Civile" } },
      { tag: { id: "t11", name: "Actes de Justice" } }
    ],
    _count: {
      comments: 3,
      exercises: 1
    },
    comments: [
      {
        id: "c4",
        author: { name: "Aïcha Touré", role: "Élève Greffière" },
        content: "La distinction entre minute et grosse était tombée à l'oral l'an dernier. Cet article résume exactement l'essentiel à savoir !",
        createdAt: "2026-09-04T12:20:00.000Z"
      }
    ],
    exercises: [
      {
        id: "ex4",
        title: "QCM d'auto-évaluation en procédure judiciaire",
        description: "10 questions pièges sur la signification des actes d'huissier, les délais de recours et les mentions obligatoires du plumitif d'audience.",
      }
    ],
    content: `
      <h2>Le rôle stratégique du greffier dans l'appareil judiciaire</h2>
      <p>Le greffier n'est pas un simple secrétaire : il est un officier public et ministériel garant de la légalité de la procédure. Sans sa présence et sa signature, la décision rendue par le juge est frappée de nullité absolue.</p>

      <h2>Les concepts clés à maîtriser absolument</h2>
      <ul>
        <li><strong>Minute vs Grosse vs Expédition :</strong> La minute est l'original conservé au greffe ; la grosse est la copie revêtue de la formule exécutoire ; l'expédition est une copie simple certifiée conforme.</li>
        <li><strong>L'audience foraine :</strong> Les règles spécifiques de compétence et de tenue du registre hors du siège du tribunal.</li>
        <li><strong>L'opposition et l'appel :</strong> Maîtriser parfaitement le point de départ des délais (notification à personne, à domicile ou à parquet).</li>
      </ul>
    `
  },
  {
    id: "default-post-4",
    slug: "organisation-memoire-programme-revision-concours",
    title: "Organisation & Mémoire : Le programme de révision idéal à 3 mois du concours",
    excerpt: "Répétition espacée, flashcards juridiques et hygiène de vie : adoptez les méthodes validées par les neurosciences pour maximiser votre taux de mémorisation.",
    readingTime: "4 min de lecture",
    category: "Méthodologie",
    publishedAt: "2026-08-26T14:00:00.000Z",
    createdAt: "2026-08-26T14:00:00.000Z",
    coverImage: "/images/image1.jpeg",
    author: {
      name: "Dr. Patricia Yao",
      role: "Docteur en Sciences Cognitives & Coach",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
    },
    tags: [
      { tag: { id: "t12", name: "Méthodologie" } },
      { tag: { id: "t13", name: "Organisation" } },
      { tag: { id: "t14", name: "Performance" } }
    ],
    _count: {
      comments: 5,
      exercises: 0
    },
    comments: [
      {
        id: "c5",
        author: { name: "Boris Koffi", role: "Candidat EPPJEJ" },
        content: "J'appliquais la méthode 25/5 (Pomodoro) sans grand succès, mais le fractionnement par matière sur des blocs de 90 minutes est 10 fois plus efficace.",
        createdAt: "2026-08-28T09:10:00.000Z"
      }
    ],
    exercises: [],
    content: `
      <h2>1. Le principe de la répétition espacée (Courbe d'Ebbinghaus)</h2>
      <p>Le cerveau humain oublie 80% des informations apprises après 48 heures si aucun rappel n'est effectué. Pour contrer cet effet, révisez une fiche selon l'échéancier suivant : J+1, J+3, J+7, J+15 et J+30.</p>

      <h2>2. Les fiches de synthèse actives</h2>
      <p>Ne recopiez pas vos cours : créez des questions-réponses. Une fiche efficace doit vous forcer à extraire l'information de votre mémoire plutôt que de vous contenter d'une relecture passive.</p>

      <h2>3. Le sommeil et l'hygiène mentale</h2>
      <p>La mémoire de long terme se consolide pendant la phase de sommeil paradoxal. Réduire vos nuits à moins de 6 heures pour réviser détruit jusqu'à 40% de vos capacités de restitution cognitive le lendemain.</p>
    `
  }
];
