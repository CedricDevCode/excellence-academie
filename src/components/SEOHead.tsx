import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  keywords?: string;
}

const SITE_NAME = 'Excellence Académie';
const BASE_URL = 'https://www.exacademie.net';

export default function SEOHead({
  title,
  description = 'Excellence Académie – Leader de la formation aux concours en Côte d\'Ivoire. Inscription formation concours : ENA, Magistrature, Greffe, Agent pénitentiaire, CAPA.',
  url = '/',
  image = '/favicon.jpeg',
  type = 'website',
  keywords = 'inscription formation concours, formation concours, ENA Côte d\'Ivoire, magistrature, greffe, notaire, avocature, CAPA, agent pénitentiaire, Excellence Académie, Abidjan, inscription Excellence Académie',
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Formation aux Concours en Côte d'Ivoire`;
  const fullUrl = `${BASE_URL}${url}`;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:locale" content="fr_CI" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
    </Helmet>
  );
}
